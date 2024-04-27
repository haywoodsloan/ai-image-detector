import puppeteer from 'puppeteer';
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

const WindowHeight = 1080;
const WindowWidth = 1920;
const ChromeUA = new UserAgent([
  /Chrome/,
  { deviceCategory: 'desktop' },
]).toString();

const ImageSelector = 'article img[src^="https://preview.redd.it"]';
const CleanupSelector = 'main article, main shreddit-ad-post, main hr';
const CleanupRemainder = 3;

const DatasetRepo = { name: 'haywoodsloan/ai-images', type: 'dataset' };
const RealPathPrefix = 'human';
const AiPathPrefix = 'artificial';

const UploadBatchSize = 10;
const RateLimitDelay = 70 * 60 * 1000;
const RateDelayWarning = colors.red(
  `Got rate-limited, waiting ${RateLimitDelay / 60 / 1000} minutes before retry`
);
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
const browser = await puppeteer.launch({
  defaultViewport: { width: WindowWidth, height: WindowHeight },
  args: [`--window-size=${WindowWidth},${WindowHeight}`],
});

const page = await browser.newPage();
await page.setUserAgent(ChromeUA);

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

  // Upload a batch of files to HuggingFace, if enough are ready
  if (fileRequests.length >= UploadBatchSize || count >= args.count) {
    const files = await Promise.all(fileRequests);
    console.log(colors.green(`Uploading ${files.length} files to HuggingFace`));
    await uploadWithRetry(files);
    fileRequests.length = 0;
  }

  // Clean up the downloaded images from the page to save memory
  // Scroll to load more images
  await page.evaluate(
    (height, selector, remainder) => {
      const elements = [...document.querySelectorAll(selector)];
      elements.slice(0, -remainder).forEach((element) => element.remove);
      window.scrollBy(0, 3 * height);
    },
    page.viewport().height,
    CleanupSelector,
    CleanupRemainder
  );
}

console.log(colors.yellow('Done!'));

// #region Functions
/**
 * @param {Upload[]} files
 */
async function uploadWithRetry(files) {
  try {
    await uploadFiles({ repo: DatasetRepo, credentials, files });
  } catch (error) {
    if (error.statusCode === 412) {
      await uploadWithRetry(files);
    } else if (error.statusCode === 429) {
      await new Promise((res) => setTimeout(res, RateLimitDelay));
      await uploadWithRetry(files);
    } else {
      // If not a known error re-throw
      throw error;
    }
  }
}
// #endregion
