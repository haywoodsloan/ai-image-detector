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
import { parse } from 'csv-parse/sync';
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
const NgoaImageCsv =
  'https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/refs/heads/main/data/published_images.csv';

const PexelsApis = [
  'https://api.pexels.com/v1/curated?per_page=80',
  'https://api.pexels.com/v1/search?query=edited&per_page=80',
];

const AiSubReddits = [
  'https://www.reddit.com/r/aiArt',
  'https://www.reddit.com/r/deepdream',
  'https://www.reddit.com/r/AIGenArt/',
  'https://www.reddit.com/r/AiArtLounge/',
  'https://www.reddit.com/r/midjourney',
  'https://www.reddit.com/r/dalle2',
  'https://www.reddit.com/r/ImagenAI/',
];

const RealSubReddits = [
  'https://www.reddit.com/r/Art/',
  'https://www.reddit.com/r/pics/',
  'https://www.reddit.com/r/BookCovers/',
  'https://www.reddit.com/r/Illustration/',
  'https://www.reddit.com/r/magazinecovers/',
  'https://www.reddit.com/r/graphic_design/',
  'https://www.reddit.com/r/museum/',
  'https://www.reddit.com/r/ArtHistory/',
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
const ImageSelector =
  'shreddit-post img[src^="https://preview.redd.it"]:not([alt=""])';

const TestRatio = 0.1;
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
const { HF_KEY, PEXELS_KEY } = await loadSettings();
setHfAccessToken(HF_KEY);

const urls = await fetchKnownUrls();
for (const url of urls) scrappedUrls.add(url);

// Track the total number of images scrapped
let count = 0;

{
  // Fetch the list of images from the National Gallery of Art
  console.log(y`Fetching image list from the National Gallery of Art`);
  const ngoaRequest = await fetch(NgoaImageCsv);

  if (!ngoaRequest.ok) {
    const error = `Status: ${ngoaRequest.statusText || ngoaRequest.status}`;
    console.log(r`Fetch failed image list, skipping to next source (${error})`);
  } else {
    // Pipe the NGoA request through the CSV parser
    const ngoaRecords = parse(await ngoaRequest.text(), {
      columns: true,
      skip_empty_lines: true,
    });

    // Iterate over each image from the NGoA
    console.log(g`Finished fetching image list`);
    for (const media of ngoaRecords) {
      if (count >= args.count) break;
      const imageUrl = new URL(`${media.iiifurl}/full/max/0/default.jpg`);

      // Skip urls to images that have already been scrapped
      if (scrappedUrls.has(imageUrl.toString())) continue;
      scrappedUrls.add(imageUrl.toString());

      queueValidation(imageUrl, RealLabel);
      if (validationQueue.size >= UploadBatchSize) {
        await queueUpload();
      }

      if (pendingUploads.size >= MaxPendingUploads) {
        await throttleUploads();
      }
    }

    // All done with NGoA images
    console.log(g`Finished fetching images from National Gallery of Art`);
  }
}

// Fetch the list of images from Pexels for each API endpoint
for (const pexelsApi of PexelsApis) {
  console.log(y`Fetching images from Pexels (${pexelsApi})`);
  const pexelsRequest = await fetch(pexelsApi, {
    headers: { Authorization: PEXELS_KEY },
  });

  if (!pexelsRequest.ok) {
    const error = `Status: ${pexelsRequest.statusText || pexelsRequest.status}`;
    console.log(r`Request failed, skipping to next source (${error})`);
    continue;
  }

  let { photos, next_page } = await pexelsRequest.json();
  while (photos.length && count < args.count) {
    const photo = photos.pop();
    const photoUrl = new URL(photo.src.original);

    // Skip urls to images that have already been scrapped
    if (!scrappedUrls.has(photoUrl.toString())) {
      scrappedUrls.add(photoUrl.toString());

      queueValidation(photoUrl, RealLabel);
      if (validationQueue.size >= UploadBatchSize) {
        await queueUpload();
      }

      if (pendingUploads.size >= MaxPendingUploads) {
        await throttleUploads();
      }
    }

    if (!photos.length && next_page) {
      const nextRequest = await fetch(next_page, {
        headers: { Authorization: PEXELS_KEY },
      });

      if (!nextRequest.ok) {
        const error = `Status: ${nextRequest.statusText || nextRequest.status}`;
        console.log(r`Request failed, skipping to next source (${error})`);
        break;
      } else ({ photos, next_page } = await nextRequest.json());
    }
  }
}

// Done with this Pexels API
console.log(g`Done fetching images from Pexels`);

{
  // Launch Puppeteer
  const browser = await launch({
    headless: !args.debug,
    defaultViewport: { width: WindowWidth, height: WindowHeight },
    args: [`--window-size=${WindowWidth},${WindowHeight}`],
  });

  /** @type {Page} */
  let page;

  // Browse to multiple Subreddits and scrape files
  try {
    for (const [label, scrapeUrls] of Object.entries(SubReddits)) {
      for (let i = 0; i < scrapeUrls.length && count < args.count; i++) {
        page = await browser.newPage();
        await page.setUserAgent(ChromeUA);

        const client = await page.createCDPSession();
        await client.send('HeapProfiler.enable');

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

            queueValidation(origin, label);
            if (validationQueue.size >= UploadBatchSize) {
              await queueUpload();
            }

            if (pendingUploads.size >= MaxPendingUploads) {
              await throttleUploads();
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

          // Scroll to load more images
          await page.evaluate(() =>
            window.scrollBy(0, document.body.scrollHeight)
          );

          // Click the retry button if an errors has occurred
          if (await page.$(RetrySelector)) {
            await wait(RedditErrorDelay);
            const retryButton = await page.$(RetrySelector);
            await retryButton?.click();
          }

          // Force garbage collection after removing extra elements.
          await client.send('HeapProfiler.collectGarbage');

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

        // Close the page to return the used memory
        await page.close();
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
    await page?.screenshot({ path: errorPng });

    console.error(r`Unexpected failure ${error}`);
    throw error;
  }

  // Close the browser to release some memory
  console.log(g`Done with all subreddits`);
  await browser.close();
}

// Upload the remaining files to Hugging Face
if (validationQueue.size) {
  const results = await Promise.all([...validationQueue]);
  const uploads = results.filter(Boolean);
  console.log(y`Partial batch of ${uploads.length} image(s) in queue`);
  pendingUploads.add(uploadImages(uploads));
}

// Wait for all pending uploads to finish
await Promise.all([...pendingUploads]);
console.log(g`Done!`);

/**
 * @param {URL} origin
 * @param {LabelType} label
 * @param {string} [auth]
 */
function queueValidation(origin, label, auth) {
  /** @type {Promise<HfImage?>} */
  const validation = (async () => {
    // Fetch the image, validate it, then determine where to upload it
    let data;
    try {
      // Get the sanitized version of the image
      data = await sanitizeImage(origin, auth);
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

  // Add the validation promise to the queue
  validationQueue.add(validation);
}

async function queueUpload() {
  /** @type {Map<string, HfImage>} */
  const unique = new Map();

  for (const validation of validationQueue) {
    const result = await validation;
    if (result && !unique.has(result.fileName))
      unique.set(result.fileName, result);
    else validationQueue.delete(validation);
  }

  // Skip uploading if less than the batch size after validation
  if (unique.size < UploadBatchSize) return;

  const pendingUpload = uploadImages([...unique.values()]).finally(() =>
    pendingUploads.delete(pendingUpload)
  );

  pendingUploads.add(pendingUpload);
  validationQueue.clear();
}

async function throttleUploads() {
  console.log(y`Waiting for one or more uploads to complete`);
  while (pendingUploads.size >= MaxPendingUploads)
    await Promise.race([...pendingUploads]).catch();
  console.log(y`Resuming scrapping`);
}
