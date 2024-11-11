import TimeSpan from 'common/utilities/TimeSpan.js';
import { b, g, r, rl, y } from 'common/utilities/colors.js';
import { sanitizeFileName } from 'common/utilities/file.js';
import { createHash } from 'common/utilities/hash.js';
import {
  AiLabel,
  RealLabel,
  TestSplit,
  TrainSplit,
  UploadBatchSize,
  fetchKnownUrls,
  setHfAccessToken,
  uploadImages,
} from 'common/utilities/huggingface.js';
import { getExt, sanitizeImage } from 'common/utilities/image.js';
import { withRetry } from 'common/utilities/retry.js';
import { loadSettings } from 'common/utilities/settings.js';
import { wait } from 'common/utilities/sleep.js';
import { mkdir, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { launch } from 'puppeteer';
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
  .parse();
// #endregion

// #region Constants
const AiSubReddits = [
  'https://www.reddit.com/r/aiArt',
  'https://www.reddit.com/r/deepdream',
  'https://www.reddit.com/r/AIGenArt/',
  'https://www.reddit.com/r/AiArtLounge/',
  'https://www.reddit.com/r/midjourney',
  'https://www.reddit.com/r/dalle2',
];
const RealSubReddits = [
  'https://www.reddit.com/r/Art/',
  'https://www.reddit.com/r/pics/',
  'https://www.reddit.com/r/BookCovers/',
  'https://www.reddit.com/r/Illustration/',
  'https://www.reddit.com/r/magazinecovers/',
  'https://www.reddit.com/r/graphic_design/'
];

const SubReddits = {
  [AiLabel]: AiSubReddits,
  [RealLabel]: RealSubReddits,
};

const LogPath = '.log/';
const WindowHeight = 1250;
const WindowWidth = 1650;
const ChromeUA = new UserAgent([
  /Chrome/,
  { deviceCategory: 'desktop' },
]).toString();

const LoaderSelector =
  'shreddit-feed faceplate-partial[id^="partial-more-posts"]';
const LoadingSelector =
  'shreddit-feed faceplate-partial[id^="partial-more-posts"][hasBeenLoaded]';
const RetrySelector = 'shreddit-feed button ::-p-text(Retry)';
const CleanupSelector =
  'shreddit-feed article, shreddit-feed shreddit-ad-post, shreddit-feed hr';
const ImageSelector =
  'shreddit-post img[src^="https://preview.redd.it"]:not([alt=""])';

const TestRatio = 0.1;
const CleanupRemainder = 9;
const RetryLimit = 10;
const MaxPendingUploads = 5;

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
const { HF_KEY } = await loadSettings();
setHfAccessToken(HF_KEY);

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
let count = 0;
try {
  for (const [label, scrapeUrls] of Object.entries(SubReddits)) {
    for (let i = 0; i < scrapeUrls.length && count < args.count; i++) {
      // Navigate to the page and wait for network traffic to settle
      const scrapeUrl = scrapeUrls[i];
      console.log(y`Navigating to ${scrapeUrl}`);
      await page.goto(scrapeUrl, { waitUntil: 'networkidle2' });

      // Wait for the loader to appear so we know the posts will load.
      const retry = withRetry(RetryLimit, RedditErrorDelay);
      await retry(
        async () => {
          await page.waitForSelector(LoaderSelector);
          console.log(g`Finished loading ${scrapeUrl}`);
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
          const shortFileName = fileName.substring(
            fileName.lastIndexOf('-') + 1
          );
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
            const hash = createHash(data);
            const ext = await getExt(data);
            const fileName = sanitizeFileName(`${hash}.${ext}`);

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
            /** @type {Map<string, HfImage>} */
            const unique = new Map();

            for (const validation of validationQueue) {
              const result = await validation;
              if (result && !unique.has(result.fileName))
                unique.set(result.fileName, result);
              else validationQueue.delete(validation);
            }

            // Skip uploading if less than the batch size after validation
            if (unique.size < UploadBatchSize) continue;

            const pendingUpload = uploadImages([...unique.values()]).finally(
              () => pendingUploads.delete(pendingUpload)
            );

            pendingUploads.add(pendingUpload);
            validationQueue.clear();
          }

          if (pendingUploads.size >= MaxPendingUploads) {
            console.log(y`Waiting for one or more uploads to complete`);
            while (pendingUploads.size >= MaxPendingUploads)
              await Promise.race([...pendingUploads]).catch();
            console.log(y`Resuming scrapping`);
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
          console.log(y`Reached end of ${scrapeUrl}`);
          break;
        }

        // Delay a bit before scrolling to avoid rate-limiting
        await wait(ScrollDelay);

        // Clean up the downloaded images from the page to save memory
        // Scroll to load more images
        await page.evaluate(
          (selector, remainder) => {
            const elements = [...document.querySelectorAll(selector)];
            for (const element of elements.slice(0, -remainder))
              element.remove();
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
        const loading = await page.$(LoadingSelector);
        if (await loading?.isVisible()) {
          try {
            await waitForHidden(loading, LoadStuckTimeout);
          } catch (error) {
            console.warn(rl`Post loading failed, refreshing ${error}`);
            await page.reload({ waitUntil: 'networkidle2' });
          }
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
  await page.screenshot({ path: errorPng });

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
