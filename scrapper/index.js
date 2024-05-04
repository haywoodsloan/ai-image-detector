import { launch } from 'puppeteer';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { listFiles, uploadFiles } from '@huggingface/hub';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { basename } from 'path';
import UserAgent from 'user-agents';
import colors from 'cli-color';
import sanitize from 'sanitize-filename';

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

// #region Types
/**
 * @typedef {{
 *  path: string,
 *  content: URL
 * }} Upload
 */

/**
 * @typedef {{
 *  isValid: boolean,
 *  error?: any
 * }} ValidationResult
 */
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
const ChromeUA = new UserAgent([
  /Chrome/,
  { deviceCategory: 'desktop' },
]).toString();

const LoaderSelector = 'main >>> shreddit-post-loading';
const LoadingSelector = 'main >>> shreddit-loading';
const ImageSelector = 'article img[src^="https://preview.redd.it"]';
const RetrySelector = '>>> button ::-p-text(Retry)';
const CleanupSelector = 'main article, main shreddit-ad-post, main hr';

const DatasetRepo = { name: 'haywoodsloan/ai-images', type: 'dataset' };
const TestSplit = 0.1;

const RealClass = 'human';
const AiClass = 'artificial';
const TrainPathPrefix = 'data/train';
const TestPathPrefix = 'data/test';

const LogPath = new URL('.log/', import.meta.url);
const SettingsPath = new URL('settings.local.json', import.meta.url);

const RetryLimit = 10;
const UploadBatchSize = 50;
const CleanupRemainder = 9;

const LoadStuckTimeout = 20 * 1000;
const HuggingFaceErrorDelay = 10 * 1000;
const RedditErrorDelay = 20 * 1000;
const RateLimitDelay = 10 * 60 * 1000;
const NextSubredditDelay = 20 * 1000;
const ScrollDelay = 2000;
// #endregion

// Parse local settings for HuggingFace credentials
const { hfKey } = JSON.parse(await readFile(SettingsPath));
const credentials = { accessToken: hfKey };

// Determine the train and test paths
const classPart = args.real ? RealClass : AiClass;
const trainPath = `${TrainPathPrefix}/${classPart}`;
const testPath = `${TestPathPrefix}/${classPart}`;

// Track existing files by the file name
const existing = new Set();
await addHfFileNames(existing, [trainPath, testPath]);

// Launch Puppeteer
const browser = await launch({
  headless: !args.debug,
  defaultViewport: { width: WindowWidth, height: WindowHeight },
  args: [`--window-size=${WindowWidth},${WindowHeight}`],
});

const page = await browser.newPage();
await page.setUserAgent(ChromeUA);

/** @type {Upload[]} */
const uploadQueue = [];

/** @type {Promise[]} */
const validations = [];

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
    await page.waitForSelector(LoaderSelector);
    console.log(colors.green(`Successfully loaded ${redditUrl}`));

    // Start scrapping images and scrolling through the page
    while (true) {
      // Get the image sources, remove any that have failed to load
      const sources = await page.$$eval(ImageSelector, (images) =>
        images.map(({ src }) => src)
      );

      // Queue image uploads to bulk upload to HuggingFace, skip existing files
      const urls = sources.map((src) => new URL(src));
      for (let i = 0; i < urls.length && count < args.count; i++) {
        const url = urls[i];
        const fileName = sanitize(basename(url.pathname));

        // Skip existing files
        if (existing.has(fileName)) continue;
        const pathPrefix = Math.random() < TestSplit ? testPath : trainPath;

        // Track new file
        console.log(colors.blue(`Found: ${fileName}`));
        existing.add(fileName);

        // Start a validation request and add to the upload queue if it passes
        validations.push(
          validateImageUrl(url).then(({ isValid, error }) => {
            if (!isValid) {
              console.log(colors.red(`Skipping: ${fileName} [${error}]`));
              return;
            }

            count++;
            uploadQueue.push({
              path: `${pathPrefix}/${fileName}`,
              content: url,
            });
          })
        );

        // If the batch has reached the upload size go ahead and upload it
        if (validations.length >= UploadBatchSize) {
          await Promise.all(validations);
          await uploadWithRetry(uploadQueue);

          validations.length = 0;
          uploadQueue.length = 0;
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
          console.warn(colors.red('Post loading failed, refreshing the page'));
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
if (validations.length) {
  await Promise.all(validations);
  await uploadWithRetry(uploadQueue);
}

// Close browser and finish
await browser.close();
console.log(colors.green('Done!'));

// #region Functions
/**
 * @param {Upload[]} files
 */
async function uploadWithRetry(files) {
  // Filter out invalid images
  if (!files.length) return;
  console.log(colors.yellow(`Uploading ${files.length} files to HF`));

  // Start a retry loop
  let retryCount = 0;
  while (true) {
    try {
      await uploadFiles({ repo: DatasetRepo, credentials, files });
      console.log(colors.green('Upload to HF succeeded'));
      break;
    } catch (error) {
      if (error.statusCode === 429) {
        // Warn about rate limiting and wait a few minutes
        const delay = RateLimitDelay / 60 / 1000;
        console.warn(colors.red(`Rate-limited, waiting ${delay} mins`));
        await wait(RateLimitDelay);
      } else if (retryCount < RetryLimit) {
        // Retry after a few seconds for other errors
        retryCount++;
        console.warn(colors.red(`Retrying after error: ${error.message}`));
        await wait(HuggingFaceErrorDelay * retryCount);
      } else {
        // If not a known error re-throw
        throw error;
      }
    }
  }
}

/**
 * @param {number} delay
 */
async function wait(delay) {
  await new Promise((res) => setTimeout(res, delay));
}

/**
 * @param {import('puppeteer').ElementHandle<Element>} element
 * @param {number} timeout
 */
async function waitForHidden(element, timeout) {
  await new Promise((res, rej) => {
    let intervalId, timeoutId;

    intervalId = setInterval(async () => {
      if (await element.isHidden()) {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        res();
      }
    }, 100);

    timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      rej(new Error("Element didn't become hidden before the timeout"));
    }, timeout);
  });
}

/**
 * @param {Set<string>} set
 * @param {string[]} paths
 */
async function addHfFileNames(set, paths) {
  await Promise.all(
    paths.map(async (path) => {
      const files = listFiles({ path, credentials, repo: DatasetRepo });
      for await (const file of files) {
        set.add(basename(file.path));
      }
    })
  );
}

/**
 * @param {URL} url
 * @returns {Promise<ValidationResult>}
 */
async function validateImageUrl(url) {
  try {
    const test = await fetch(url, { method: 'HEAD' });
    if (!test.ok) throw new Error(`HEAD request failed: ${test.statusText}`);

    const contentType = test.headers.get('Content-Type');
    const validHeader = contentType.startsWith('image/');
    if (!validHeader) throw new Error(`Invalid MIME type: ${contentType}`);

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error };
  }
}
// #endregion
