import colors from 'cli-color';
import { loadSettings } from 'common/utilities/settings.js';
import { wait } from 'common/utilities/sleep.js';
import { mkdir, writeFile } from 'fs/promises';
import { basename } from 'path';
import { launch } from 'puppeteer';
import sanitize from 'sanitize-filename';
import { fileURLToPath } from 'url';
import UserAgent from 'user-agents';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { ImageValidationQueue } from './utilities/ImageValidationQueue.js';
import {
  AiClass,
  RealClass,
  TestPathPrefix,
  TrainPathPrefix,
  addFoundImage,
  isExistingImage,
  preloadExistingImages,
  setHfAccessToken,
  uploadWithRetry,
} from './utilities/huggingface.js';
import { waitForHidden } from './utilities/puppeteer.js';

// #region Command Arguments
const args = yargs(hideBin(process.argv))
  .option('count', {
    type: 'number',
    description: 'The maximum number of images to scrape',
    default: Infinity,
  })
  .option('debug', {
    type: 'boolean',
    description: 'Show the browser for debugging',
    default: false,
  })
  .option('real', {
    type: 'boolean',
    description: 'If real (non-AI) images should be scrapped',
    default: false,
  }).argv;
// #endregion

// #region Constants
const AiSubReddits = [
  'https://www.reddit.com/r/aiArt',
  'https://www.reddit.com/r/deepdream',
];
const RealSubReddits = [
  'https://www.reddit.com/r/Art/',
  'https://www.reddit.com/r/pics/',
];

const WindowHeight = 1250;
const WindowWidth = 1650;

const ImageUrlRegex = /.*\/[^/]+-([^.-]+\.[^?]+).*/;
const ChromeUA = new UserAgent([
  /Chrome/,
  { deviceCategory: 'desktop' },
]).toString();

const LoaderSelector = 'main >>> shreddit-post-loading';
const LoadingSelector = 'main >>> shreddit-loading';
const RetrySelector = 'main >>> button ::-p-text(Retry)';
const CleanupSelector = 'main article, main shreddit-ad-post, main hr';
const ImageSelector =
  'shreddit-post img[src^="https://preview.redd.it"]:not([alt=""])';

const LogPath = new URL('../.log/', import.meta.url);
const ConfigPath = new URL('../config/', import.meta.url);

const TestSplit = 0.1;
const UploadBatchSize = 50;
const CleanupRemainder = 9;
const RetryLimit = 10;

const LoadStuckTimeout = 20 * 1000;
const RedditErrorDelay = 20 * 1000;
const NextSubredditDelay = 20 * 1000;
const ScrollDelay = 2000;
// #endregion

// Parse local settings for HuggingFace credentials
const { hfKey } = await loadSettings(ConfigPath);
setHfAccessToken(hfKey);

// Start preloading the existing image names
preloadExistingImages();

// Determine the train and test paths
const classPart = args.real ? RealClass : AiClass;
const trainPath = `${TrainPathPrefix}/${classPart}`;
const testPath = `${TestPathPrefix}/${classPart}`;

// Launch Puppeteer
const browser = await launch({
  headless: !args.debug,
  defaultViewport: { width: WindowWidth, height: WindowHeight },
  args: [`--window-size=${WindowWidth},${WindowHeight}`],
});

const page = await browser.newPage();
await page.setUserAgent(ChromeUA);

const validationQueue = await ImageValidationQueue.createQueue();
let count = 0;

try {
  // Browse to multiple Subreddits and scrape files
  const redditUrls = args.real ? RealSubReddits : AiSubReddits;
  for (let i = 0; i < redditUrls.length && count < args.count; i++) {
    // Wait before loading additional Subreddits
    if (i > 0) {
      const delay = NextSubredditDelay / 1000;
      console.log(colors.yellow(`Waiting ${delay} secs before next Subreddit`));
      await wait(NextSubredditDelay);
    }

    // Navigate to the page and wait for network traffic to settle
    const redditUrl = redditUrls[i];
    console.log(colors.yellow(`Navigating to ${redditUrl}`));
    await page.goto(redditUrl, { waitUntil: 'networkidle2' });

    // Wait for the loader to appear so we know the posts will load.
    let retryCount = 0;
    while (true) {
      try {
        await page.waitForSelector(LoaderSelector);
        console.log(colors.green(`Successfully loaded ${redditUrl}`));
        break;
      } catch (error) {
        if (retryCount >= RetryLimit) throw error;
        console.log(colors.red(`Subreddit loading failed, refreshing`));
        await wait(RedditErrorDelay);
        
        await page.reload({ waitUntil: 'networkidle2' });
        retryCount++;
      }
    }

    // Start scrapping images and scrolling through the page
    while (true) {
      // Get the image sources
      const sources = await page.$$eval(ImageSelector, (images) =>
        images.map(({ src }) => src)
      );

      // Replace the preview urls with full image urls
      const urls = sources.map(
        (src) => new URL(src.replace(ImageUrlRegex, 'https://i.redd.it/$1'))
      );

      // Queue image uploads to bulk upload to HuggingFace, skip existing files
      for (let i = 0; i < urls.length && count < args.count; i++) {
        const url = urls[i];
        const fileName = sanitize(basename(url.pathname));

        // Skip existing files
        if (await isExistingImage(fileName)) continue;
        const pathPrefix = Math.random() < TestSplit ? testPath : trainPath;

        // Track new file
        console.log(colors.blue(`Found: ${fileName}`));
        addFoundImage(fileName);

        // Start a validation request and add to the count if it passes
        validationQueue
          .queueValidation({ path: `${pathPrefix}/${fileName}`, content: url })
          .then((isValid) => isValid && count++);

        // If the batch has reached the upload size go ahead and upload it
        if (validationQueue.size >= UploadBatchSize) {
          const uploads = await validationQueue.getValidated();
          await uploadWithRetry(uploads);
          validationQueue.clear();
        }
      }

      // Break if we've reached the maximum number of images
      if (count >= args.count) {
        console.log(colors.yellow('Reached maximum image count'));
        break;
      }

      // Check if the post loader is gone
      // If so break, we've reached the end of the Subreddit
      const loader = await page.$(LoaderSelector);
      if (!loader) {
        console.log(colors.yellow('Reached end of Subreddit'));
        break;
      }

      // Delay a bit before scrolling to avoid rate-limiting
      await wait(ScrollDelay);

      // Clean up the downloaded images from the page to save memory
      // Scroll to load more images
      await page.evaluate(
        (selector, remainder) => {
          const elements = [...document.querySelectorAll(selector)];
          elements.slice(0, -remainder).forEach((element) => element.remove());
          window.scrollBy(0, document.body.scrollHeight);
        },
        ...[CleanupSelector, CleanupRemainder]
      );

      // Click the retry button if an errors has occurred
      if (await page.$(RetrySelector)) {
        await wait(RedditErrorDelay);
        const retryButton = await page.$(RetrySelector);
        await retryButton?.click();
      }

      // Wait for the loader to disappear and the posts to finish loading
      let loading = await page.$(LoadingSelector);
      if (await loading?.isVisible()) {
        try {
          await waitForHidden(loading, LoadStuckTimeout);
        } catch {
          console.warn(colors.red('Post loading failed, refreshing'));
          await page.reload({ waitUntil: 'networkidle2' });
        }
      }
    }
  }
} catch (error) {
  // Make sure the log directory exists
  await mkdir(LogPath, { recursive: true });

  // Log the last stack trace
  const errorLog = new URL('error.log', LogPath);
  await writeFile(errorLog, error.stack);

  // Log the last screenshot
  const errorPng = new URL('error.png', LogPath);
  await page.screenshot({ path: fileURLToPath(errorPng) });

  throw error;
}

// Upload the remaining files to HuggingFace
if (validationQueue.size) {
  const uploads = await validationQueue.getValidated();
  await uploadWithRetry(uploads);
}

// Close browser and finish
await browser.close();
console.log(colors.green('Done!'));
