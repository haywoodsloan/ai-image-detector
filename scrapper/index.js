import { launch } from 'puppeteer';
import { readFile } from 'fs/promises';
import { listFiles, uploadFiles } from '@huggingface/hub';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { basename } from 'path';
import UserAgent from 'user-agents';
import colors from 'cli-color';

// #region Command Arguments
const args = yargs(hideBin(process.argv))
  .option('count', {
    type: 'number',
    description: 'The maximum number of images to scrape',
    demandOption: 'Must specify a maximum number of images to scrape',
  })
  .option('debug', {
    type: 'boolean',
    description: 'Show the browser for debugging',
    default: false,
  })
  .group(['real', 'pics'], 'Real Image Scrapping')
  .option('real', {
    type: 'boolean',
    description: 'If real (non-AI) images should be scrapped',
    default: false,
  })
  .option('pics', {
    type: 'boolean',
    description: 'If real pictures should be scrapped',
    default: false,
  }).argv;
// #endregion

// #region Types
/**
 * @typedef {{
 *  path: string,
 *  content: import('@huggingface/hub').ContentSource
 * }} Upload
 */
// #endregion

// #region Constants
const AiSubReddit = 'https://www.reddit.com/r/aiArt';
const RealArtSubReddit = 'https://www.reddit.com/r/Art/';
const RealPicsSubReddit = 'https://www.reddit.com/r/pics/';

const WindowHeight = 1250;
const WindowWidth = 1650;
const ChromeUA = new UserAgent([
  /Chrome/,
  { deviceCategory: 'desktop' },
]).toString();

const LoaderSelector = 'main faceplate-partial[id^="partial-more-posts"]';
const ImageSelector = 'article img[src^="https://preview.redd.it"]';
const RetrySelector = '>>> button ::-p-text(Retry)';
const CleanupSelector = 'main article, main shreddit-ad-post, main hr';

const DatasetRepo = { name: 'haywoodsloan/ai-images', type: 'dataset' };
const RealPathPrefix = 'human';
const AiPathPrefix = 'artificial';

const RetryLimit = 3;
const UploadBatchSize = 10;
const CleanupRemainder = 15;

const RequestErrorDelay = 1000;
const LoadErrorDelay = 30 * 1000;
const RateLimitDelay = 10 * 60 * 1000;

const RateDelayWarning = colors.red(
  `Rate-limited, waiting ${RateLimitDelay / 60 / 1000} minutes to retry`
);
const RequestErrorWarning = (/** @type {Error} */ error) =>
  colors.red(`Retrying after error: ${error.message}`);
// #endregion

// Parse local settings for HuggingFace credentials
const { hfKey } = JSON.parse(
  await readFile(new URL('./settings.local.json', import.meta.url))
);
const credentials = { accessToken: hfKey };

// Get a set of the existing images
const pathPrefix = args.real ? RealPathPrefix : AiPathPrefix;
const files = listFiles({
  repo: DatasetRepo,
  path: pathPrefix,
  credentials,
});

// Track existing files by the file name
const existing = new Set();
for await (const file of files) {
  existing.add(basename(file.path));
}

// Launch Puppeteer
const browser = await launch({
  headless: !args.debug,
  defaultViewport: { width: WindowWidth, height: WindowHeight },
  args: [`--window-size=${WindowWidth},${WindowHeight}`],
});

const page = await browser.newPage();
await page.setUserAgent(ChromeUA);

page.on('error', (error) => {
  console.error('Error from puppeteer:', error);
});

page.on('pageerror', (error) => {
  console.error('PageError from puppeteer:', error);
});

// Browse to Reddit
const redditUrl = args.real
  ? args.pics
    ? RealPicsSubReddit
    : RealArtSubReddit
  : AiSubReddit;

await page.goto(redditUrl, {
  waitUntil: 'networkidle0',
});

/** @type {Promise<Upload>[]} */
const fileRequests = [];
let count = 0;

// Start scrapping images and scrolling through the page
while (count < args.count) {
  // Get just the new URLs that haven't been downloaded yet
  const urls = await page.evaluate((selector) => {
    const images = document.querySelectorAll(selector);
    return [...images].map((image) => image.src);
  }, ImageSelector);

  // Fetch the file blobs and prepare to bulk upload to HuggingFace
  for (const url of urls) {
    const { pathname } = new URL(url);
    const fileName = basename(pathname);

    if (existing.has(fileName)) continue;
    console.log(colors.green(`Downloading: ${fileName}`));

    existing.add(fileName);
    fileRequests.push(
      fetch(url).then(async (result) => ({
        path: `${pathPrefix}/${fileName}`,
        content: await result.blob(),
      }))
    );

    count++;
    if (count >= args.count || fileRequests.length >= UploadBatchSize) break;
  }

  // Check if the post loader is gone
  const loader = await page.$(LoaderSelector);

  // Upload a batch of files to HuggingFace, if enough are ready
  if (
    fileRequests.length >= UploadBatchSize ||
    count >= args.count ||
    !loader
  ) {
    const files = await Promise.all(fileRequests);
    console.log(colors.green(`Uploading ${files.length} files to HuggingFace`));
    await uploadWithRetry(files);
    fileRequests.length = 0;
  }

  // Break if we've reached the maximum number of images
  if (count >= args.count) {
    console.log(colors.yellow('Reached maximum image count'));
    break;
  }

  // Break if we've reached the end of the subreddit
  if (!loader) {
    console.log(colors.yellow('Reached end of Subreddit'));
    break;
  }

  // Clean up the downloaded images from the page to save memory
  // Scroll to load more images
  await page.evaluate(
    (selector, remainder) => {
      window.scrollBy(0, document.body.scrollHeight);
      const elements = [...document.querySelectorAll(selector)];
      elements.slice(0, -remainder).forEach((element) => element.remove());
    },
    CleanupSelector,
    CleanupRemainder
  );

  // Click the retry button if an errors has occurred
  const retryButton = await page.$(RetrySelector);
  if (retryButton) {
    await wait(LoadErrorDelay);
    await retryButton.click();
  }
}

await browser.close();
console.log(colors.yellow('Done!'));

// #region Functions
/**
 * @param {Upload[]} files
 */
async function uploadWithRetry(files, retryCount = 0) {
  try {
    await uploadFiles({ repo: DatasetRepo, credentials, files });
  } catch (error) {
    if (error.statusCode === 429) {
      // Warn about rate limiting and wait a few minutes
      console.warn(RateDelayWarning);
      await wait(RateLimitDelay);
      await uploadWithRetry(files, retryCount);
    } else if (retryCount < RetryLimit) {
      // Retry after a few seconds for other errors
      console.warn(RequestErrorWarning(error));
      await wait(RequestErrorDelay);
      await uploadWithRetry(files, retryCount + 1);
    } else {
      // If not a known error re-throw
      throw error;
    }
  }
}

/**
 * @param {number} delay
 */
async function wait(delay) {
  await new Promise((res) => setTimeout(res, delay));
}
// #endregion