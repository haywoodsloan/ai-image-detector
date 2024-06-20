import {
  commit,
  downloadFile,
  fileExists,
  listFiles,
  uploadFile,
  uploadFiles,
} from '@huggingface/hub';
import { HfInference } from '@huggingface/inference';
import { g, r, y } from 'common/utilities/colors.js';
import { wait } from 'common/utilities/sleep.js';
import memoize from 'memoize';
import { basename, dirname } from 'path';

import TimeSpan from './TimeSpan.js';
import { firstResult } from './async.js';
import { withRetry } from './retry.js';

export const MainBranch = 'main';
export const DataPath = 'data';
export const UrlListPath = `${DataPath}/urls.txt`;

export const TrainSplit = 'train';
export const TestSplit = 'test';
export const AllSplits = [TrainSplit, TestSplit];

export const RealLabel = 'real';
export const AiLabel = 'artificial';
export const AllLabels = [RealLabel, AiLabel];

const RetryLimit = 10;
const MaxSubsetSize = 10_000;

const UrlUploadDelay = 100;
const HuggingFaceErrorDelay = TimeSpan.fromSeconds(10);
const RateLimitDelay = TimeSpan.fromMinutes(10);

const DatasetRepo = { name: 'haywoodsloan/ai-images', type: 'dataset' };

/** @type {{accessToken: string}} */
const credentials = {};

/** @type {Set<string>} */
const pendingPaths = new Set();

/**
 * @type {Map<string, {
 *   promise: Promise<void>,
 *   resolve: () => void,
 *   reject: (error: Error) => void
 * }>}
 */
const pendingUrls = new Map();

// Share a retry invoker for all operations
const retry = withRetry(RetryLimit, HuggingFaceErrorDelay);

// Cache the HF interface until the access token changes
const getHfInterface = memoize(
  () => new HfInference(credentials?.accessToken),
  { cacheKey: () => credentials?.accessToken }
);

/**
 * @param {string} fileName
 */
export async function isExistingImage(fileName, branch = MainBranch) {
  return !!(await getFullImagePath(fileName, branch));
}

/**
 * @param {HfImage} image
 */
export async function replaceImage(image, branch = MainBranch) {
  // Error if the files doesn't exists already
  const { fileName, label: newLabel } = image;
  const oldPath = await getFullImagePath(fileName, branch);
  if (!oldPath) throw new Error('File to replace missing from HF');

  // Skip if the old and new labels are the same
  // Return false to indicate no change was made
  const { label: oldLabel } = parsePath(oldPath);
  if (oldLabel === newLabel) return false;
  console.log(y`Moving file on HF ${fileName}`);

  // Move the image
  await retry(
    async () => {
      // Create a new upload for the replacement
      const [upload] = await createUploads([image], branch);
      pendingPaths.add(upload.path);

      try {
        await commit({
          operations: [
            { operation: 'delete', path: oldPath },
            { operation: 'addOrUpdate', ...upload },
          ],
          repo: DatasetRepo,
          branch,
          credentials,
          useWebWorkers: true,
          title: `Move image ${oldPath} => ${upload.path}`,
        });
      } finally {
        // Remove the pending paths either way because we'll get new paths
        pendingPaths.delete(upload.path);
      }

      // Add the new image's url
      console.log(y`Successfully moved file ${oldPath} => ${upload.path}`);
      await uploadKnownUrls([upload.origin], branch);
    },
    (error) => {
      console.warn(r`Retrying move [${error}]`);
    }
  );

  // Return true if successfully replaced
  return true;
}

/**
 * @param {HfImage[]} images
 */
export async function uploadImages(images, branch = MainBranch) {
  // Skip if no images in the array
  if (!images.length) return;
  console.log(y`Uploading ${images.length} file(s) to HF`);

  // Start a retry loop
  await retry(
    async () => {
      // Double check that all the images are new
      // A duplicate image may have been added since validation
      const newImages = await Promise.all(
        images.map(async (image) => {
          if (!(await isExistingImage(image.fileName, branch))) return image;
          console.log(y`Skipping ${image.fileName} [Image already on HF]`);
        })
      );

      // Create a set of upload for the image
      // Recreate with each retry incase the folders are now full
      const uploads = await createUploads(newImages.filter(Boolean), branch);
      const uploadCt = uploads.length;

      // If there are new uploads push them to HF
      if (uploadCt) {
        for (const { path } of uploads) pendingPaths.add(path);
        try {
          // Upload the images and url update
          await uploadFiles({
            files: uploads,
            repo: DatasetRepo,
            branch,
            credentials,
            useWebWorkers: true,
            commitTitle: `Add ${uploadCt} images`,
          });
        } finally {
          // Remove the pending paths either way because we'll get new paths
          for (const { path } of uploads) pendingPaths.delete(path);
        }
        
        const skippedCt = images.length - uploadCt;
        console.log(g`${uploadCt} file(s) uploaded [${skippedCt} skipped]`);
      }

      // Add all urls to the known list even if we skipped them
      await uploadKnownUrls(
        images.map(({ origin }) => origin),
        branch
      );
    },
    async (error, retryCount) => {
      if (error.statusCode === 429) {
        // Warn about rate limiting and wait a few minutes
        await wait(RateLimitDelay - HuggingFaceErrorDelay * retryCount);
        const delay = RateLimitDelay / 60 / 1000;
        console.warn(r`Rate-limited, waiting ${delay} mins`);
      } else console.warn(r`Retrying upload [${error}]`);
    }
  );
}

export async function fetchKnownUrls(branch = MainBranch) {
  return await retry(
    async () => {
      const exists = await fileExists({
        path: UrlListPath,
        repo: DatasetRepo,
        revision: branch,
        credentials,
      });

      // If the file doesn't exists just return an empty array
      if (!exists) return [];

      // Get the latest url list
      const urlFile = await downloadFile({
        path: UrlListPath,
        repo: DatasetRepo,
        revision: branch,
        credentials,
      });

      // Split the urls by line
      const urlStr = await urlFile.text();
      return urlStr.split(/\r?\n/).filter(Boolean);
    },
    (error) => {
      console.warn(r`Retrying url list fetch [${error}]`);
    }
  );
}

/**
 * @param {(string | URL)[]} urls
 */
export async function uploadKnownUrls(urls, branch = MainBranch) {
  // Skip if no urls are specified
  if (!urls.length) return;
  urls = urls.map((url) => url.toString());

  // If there aren't any pending urls well start a new loop
  const shouldRun = !pendingUrls.size;

  // Track the existing pending uploads and what's missing
  const pending = [];
  for (const url of urls) {
    if (pendingUrls.has(url)) {
      const { promise } = pendingUrls.get(url);
      pending.push(promise);
    } else {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });

      // Add a new pending url
      pending.push(promise);
      pendingUrls.set(url, { resolve, reject, promise });
    }
  }

  if (shouldRun) {
    // Run an async loop uploading any pending urls
    (async () => {
      await wait(UrlUploadDelay);
      while (pendingUrls.size) {
        // Get the current list of urls
        const allUrls = new Set(await fetchKnownUrls(branch));

        // Add the new urls to the set, don't upload if nothing new
        const newUrls = [];
        for (const [url, { resolve }] of pendingUrls) {
          if (allUrls.has(url)) {
            pendingUrls.delete(url);
            resolve();
          } else {
            allUrls.add(url);
            newUrls.push(url);
          }
        }

        // If no urls are new continue
        if (!newUrls.length) continue;

        // Build the url list upload data
        const urlData = new Blob([[...allUrls].join('\n')]);
        const urlsUpload = { path: UrlListPath, content: urlData };

        try {
          await retry(
            async () => {
              await uploadFile({
                file: urlsUpload,
                repo: DatasetRepo,
                branch,
                credentials,
                useWebWorkers: true,
                commitTitle: `Add ${newUrls.length} known URLs`,
              });
            },
            (error) => {
              console.warn(r`Retrying url list upload [${error}]`);
            }
          );

          // Resolve the uploaded urls
          for (const url of newUrls) {
            pendingUrls.get(url).resolve();
            pendingUrls.delete(url);
          }
        } catch (error) {
          // If the retry failed reject the urls for this upload
          for (const url of newUrls) {
            pendingUrls.get(url).reject(error);
            pendingUrls.delete(url);
          }
        }
      }
    })();
  }

  // Return a promise that resolves once all the URLs are uploaded
  return Promise.all(pending);
}

/**
 * @param {string} hfToken
 */
export function setHfAccessToken(hfToken) {
  if (!hfToken) throw new Error('Invalid HF token');
  credentials.accessToken = hfToken;
}

/**
 *
 * @param {ImageClassificationArgs} args
 * @param {ClassificationOptions} options
 */
export async function getImageClassification(args, options) {
  return getHfInterface().imageClassification(args, options);
}

/**
 * @param {string} fileName
 */
async function getFullImagePath(fileName, branch = MainBranch) {
  // Will abort other requests
  const abort = new AbortController();

  // If not using the cache, check all splits/labels/subsets
  const result = await firstResult(AllSplits, async (split) => {
    const subsets = listFiles({
      path: `${DataPath}/${split}`,
      repo: DatasetRepo,
      revision: branch,
      credentials,
    });

    return await firstResult(subsets, async (subset) => {
      if (subset.type !== 'directory') return;

      return await firstResult(AllLabels, async (label) => {
        const filePath = `${subset.path}/${label}/${fileName}`;

        const found = await fileExists({
          path: filePath,
          repo: DatasetRepo,
          revision: branch,
          credentials,
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              signal: abort.signal,
            }),
        });

        if (found) return filePath;
      });
    });
  });

  abort.abort();
  return result;
}

/**
 * @param {string} path
 */
function parsePath(path) {
  const labelDir = dirname(path);
  const label = basename(labelDir);

  const subsetDir = dirname(labelDir);
  const subset = basename(subsetDir);
  const subsetIdx = Number(subset.substring(subset.indexOf('-') + 1));

  const splitDir = dirname(subsetDir);
  const split = basename(splitDir);

  return { split, label, subset, subsetIdx };
}

/**
 * @param {string} split
 * @param {string} label
 * @param {number} subsetIdx
 */
function buildPath(split, label, subsetIdx, fileName = '') {
  const subset = `set-${String(subsetIdx).padStart(3, '0')}`;
  return fileName
    ? `${DataPath}/${split}/${subset}/${label}/${fileName}`
    : `${DataPath}/${split}/${subset}/${label}`;
}

/**
 * @param {HfImage[]} uploads
 */
async function createUploads(uploads, branch = MainBranch) {
  /** @type {{[key: string]: {[key: string]: number[]}}} */
  const subsetCounts = {
    [TrainSplit]: { [AiLabel]: [], [RealLabel]: [] },
    [TestSplit]: { [AiLabel]: [], [RealLabel]: [] },
  };

  /** @type {HfUpload[]} */
  const uploadsWithPath = [];
  for (const upload of uploads) {
    const { fileName, split, label } = upload;
    const subsets = subsetCounts[split][label];

    let subsetIdx = subsets.findIndex((count) => count < MaxSubsetSize);
    if (subsetIdx === -1) {
      for (subsetIdx = subsets.length; ; subsetIdx++) {
        // Start the subset count based on the other pending paths
        const prefix = buildPath(split, label, subsetIdx);
        subsets[subsetIdx] = [...pendingPaths].filter((path) =>
          path.startsWith(prefix)
        ).length;

        // Check how many images are in the folder
        let images;
        try {
          images = listFiles({
            path: prefix,
            repo: DatasetRepo,
            revision: branch,
            credentials,
          });
        } catch {
          // If the list fails this subset is new
          break;
        }

        // Add any found images to the count
        for await (const image of images) {
          if (image.type === 'file') subsets[subsetIdx]++;
        }

        // Use this subset if the count isn't at max
        if (subsets[subsetIdx] < MaxSubsetSize) break;
      }
    }

    // Add the path to the open subset to the upload
    // Also track the subset count
    subsets[subsetIdx]++;
    const path = buildPath(split, label, subsetIdx, fileName);
    uploadsWithPath.push({ ...upload, path });
  }

  return uploadsWithPath;
}
