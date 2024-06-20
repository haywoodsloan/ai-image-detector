import TimeSpan from 'common/utilities/TimeSpan.js';
import { b, g, r, y } from 'common/utilities/colors.js';
import { hashImage } from 'common/utilities/hash.js';
import {
  AiLabel,
  RealLabel,
  TestSplit,
  TrainSplit,
  fetchKnownUrls,
  setHfAccessToken,
  uploadImages,
} from 'common/utilities/huggingface.js';
import { sanitizeImage } from 'common/utilities/image.js';
import { withRetry } from 'common/utilities/retry.js';
import { loadSettings } from 'common/utilities/settings.js';
import { wait } from 'common/utilities/sleep.js';
import { mkdir, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import { launch } from 'puppeteer';
import sanitize from 'sanitize-filename';
import { fileURLToPath } from 'url';
import UserAgent from 'user-agents';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { waitForHidden } from './utilities/puppeteer.js';

// #region Command Arguments
const args = await yargs(hideBin(process.argv))
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
  })
  .parse();
// #endregion

// #region Constants
const AiSubReddits = [
  'https://www.reddit.com/r/aiArt',
  'https://www.reddit.com/r/deepdream',
];
const RealSubReddits = [
  'https://www.reddit.com/r/Art/',
  'https://www.reddit.com/r/pics/',
  'https://www.reddit.com/r/BookCovers/',
];

const LogPath = '.log/';
const WindowHeight = 1250;
const WindowWidth = 1650;
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

const TestRatio = 0.1;
const UploadBatchSize = 50;
const CleanupRemainder = 9;
const RetryLimit = 10;

const LoadStuckTimeout = TimeSpan.fromSeconds(20);
const RedditErrorDelay = TimeSpan.fromSeconds(20);
const ScrollDelay = TimeSpan.fromSeconds(2);
// #endregion

/** @type {Set<Promise<HfImage?>>} */
const validationQueue = new Set();

/** @type {Set<Promise<void>>} */
const pendingUploads = new Set();

/** @type {Set<string>} */
const scrappedUrls = new Set();

// Parse local settings for Hugging Face credentials
const { hfKey } = await loadSettings();
setHfAccessToken(hfKey);

// Determine the train and test paths
const label = args.real ? RealLabel : AiLabel;

// Launch Puppeteer
const browser = await launch({
  headless: !args.debug,
  defaultViewport: { width: WindowWidth, height: WindowHeight },
  args: [`--window-size=${WindowWidth},${WindowHeight}`],
});

const page = await browser.newPage();
await page.setUserAgent(ChromeUA);

const urls = await fetchKnownUrls();
for await (const url of urls) scrappedUrls.add(url);

// Browse to multiple Subreddits and scrape files
const redditUrls = args.real ? RealSubReddits : AiSubReddits;
let count = 0;

try {
  for (let i = 0; i < redditUrls.length && count < args.count; i++) {
    // Navigate to the page and wait for network traffic to settle
    const redditUrl = redditUrls[i];
    console.log(y`Navigating to ${redditUrl}`);
    await page.goto(redditUrl, { waitUntil: 'networkidle2' });

    // Wait for the loader to appear so we know the posts will load.
    const retry = withRetry(RetryLimit, RedditErrorDelay);
    await retry(
      async () => {
        await page.waitForSelector(LoaderSelector);
        console.log(g`Finished loading ${redditUrl}`);
      },
      async () => {
        console.log(r`Subreddit loading failed, refreshing`);
        await page.reload({ waitUntil: 'networkidle2' });
      }
    );

    // Start scrapping images and scrolling through the page
    while (true) {
      // Get the image sources
      const sources = await page.$$eval(ImageSelector, (images) =>
        images.map(({ src }) => src)
      );

      // Replace the preview urls with full image urls
      const urls = sources.map((src) => {
        const { pathname } = new URL(src);
        const fileName = basename(pathname);
        const shortFileName = fileName.substring(fileName.lastIndexOf('-') + 1);
        return new URL(`https://i.redd.it/${shortFileName}`);
      });

      // Queue image uploads to bulk upload to Hugging Face, skip existing files
      for (let i = 0; i < urls.length && count < args.count; i++) {
        const origin = urls[i];

        // Skip urls to images that have already been scrapped
        if (scrappedUrls.has(origin.toString())) continue;
        scrappedUrls.add(origin.toString());

        /** @type {Promise<HfImage?>} */
        const validation = (async () => {
          // Fetch the image, validate it, then determine where to upload it
          let data;
          try {
            // Get the sanitized version of the image
            data = await sanitizeImage(origin);
          } catch (error) {
            // If the image couldn't be sanitized skip it
            console.log(r`Skipping ${origin} [${error}]`);
            validationQueue.delete(validation);
            return;
          }

          // Build the file name from the hash of the data
          const hash = hashImage(data);
          const ext = extname(origin.pathname);
          const fileName = sanitize(`${hash}${ext}`);

          // Get a split to add the image to
          console.log(b`Found ${fileName} at ${origin}`);
          const split = Math.random() < TestRatio ? TestSplit : TrainSplit;

          // Increase the total count and return an image object
          count++;
          const content = new Blob([data]);
          return { split, label, fileName, origin, content };
        })();

        validationQueue.add(validation);
        if (validationQueue.size >= UploadBatchSize) {
          const results = await Promise.all([...validationQueue]);
          const images = results.filter(Boolean);

          // Skip uploading if less than the batch size after validation
          if (images.length < UploadBatchSize) continue;

          const pendingUpload = uploadImages(images).then(async () =>
            pendingUploads.delete(pendingUpload)
          );

          pendingUploads.add(pendingUpload);
          validationQueue.clear();
        }
      }

      // Break if we've reached the maximum number of images
      if (count >= args.count) {
        console.log(y`Reached maximum image count`);
        break;
      }

      // Check if the post loader is gone
      // If so break, we've reached the end of the Subreddit
      const loader = await page.$(LoaderSelector);
      if (!loader) {
        console.log(y`Reached end of ${redditUrl}`);
        break;
      }

      // Delay a bit before scrolling to avoid rate-limiting
      await wait(ScrollDelay);

      // Clean up the downloaded images from the page to save memory
      // Scroll to load more images
      await page.evaluate(
        (selector, remainder) => {
          const elements = [...document.querySelectorAll(selector)];
          for (const element of elements.slice(0, -remainder)) element.remove();
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
          console.warn(r`Post loading failed, refreshing`);
          await page.reload({ waitUntil: 'networkidle2' });
        }
      }
    }
  }
} catch (error) {
  // Make sure the log directory exists
  await mkdir(LogPath, { recursive: true });

  // Log the last stack trace
  const errorLog = join(LogPath, 'error.log');
  await writeFile(errorLog, error.stack);

  // Log the last screenshot
  const errorPng = join(LogPath, 'error.png');
  await page.screenshot({ path: fileURLToPath(errorPng) });

  throw error;
}

// Upload the remaining files to Hugging Face
if (validationQueue.size) {
  const results = await Promise.all([...validationQueue]);
  const uploads = results.filter(Boolean);
  pendingUploads.add(uploadImages(uploads));
}

// Wait for all pending uploads to finish
await Promise.all([...pendingUploads]);

// Close browser and finish
await browser.close();
console.log(g`Done!`);
