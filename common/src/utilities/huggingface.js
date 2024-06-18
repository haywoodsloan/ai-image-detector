import {
  deleteFile,
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

import ActionQueue from './ActionQueue.js';
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

const HuggingFaceErrorDelay = TimeSpan.fromSeconds(10);
const RateLimitDelay = TimeSpan.fromMinutes(10);

const DatasetRepo = { name: 'haywoodsloan/ai-images', type: 'dataset' };

/** @type {{accessToken: string}} */
const credentials = {};

/** @type {Set<string>} */
const pendingPaths = new Set();
const urlUploadQueue = new ActionQueue();

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
  const oldPath = await getFullImagePath(fileName);
  if (!oldPath) throw new Error('File to replace missing from HF');

  // Skip if the old and new labels are the same
  // Return false to indicate no change was made
  const { label: oldLabel } = parsePath(oldPath);
  if (oldLabel === newLabel) return false;
  console.log(y`Moving file on HF: ${fileName}`);

  // First delete the old image
  const retry = withRetry(RetryLimit, HuggingFaceErrorDelay);
  await retry(
    async () => {
      await deleteFile({
        branch,
        repo: DatasetRepo,
        credentials,
        path: oldPath,
      });
      console.log(y`Successfully deleted old file: ${oldPath}`);
    },
    (error) => {
      console.warn(r`Retrying delete after error: ${error.message}`);
    }
  );

  // Next upload the new image
  await retry(
    async () => {
      // Create a new upload for the replacement
      const [upload] = await createUploads([image], branch);
      pendingPaths.add(upload.path);

      try {
        // Upload the file in the new location
        await uploadFile({
          file: upload,
          repo: DatasetRepo,
          branch,
          credentials,
          useWebWorkers: true,
        });
      } finally {
        // Remove the pending paths either way because we'll get new paths
        pendingPaths.delete(upload.path);
      }
      console.log(g`Successfully moved file: ${upload.path}`);
    },
    (error) => {
      console.warn(r`Retrying upload after error: ${error.message}`);
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
  console.log(y`Uploading ${images.length} files to HF`);

  // Start a retry loop
  const retry = withRetry(RetryLimit, HuggingFaceErrorDelay);
  await retry(
    async () => {
      // Double check that all the images are new
      // A duplicate image may have been added since validation
      const newImages = await Promise.all(
        images.map(async (image) => {
          if (!(await isExistingImage(image.fileName))) return image;
          console.log(y`Skipping: ${image.fileName} [Image already on HF]`);
        })
      );

      // Create a set of upload for the image
      // Recreate with each retry incase the folders are now full
      const uploads = await createUploads(newImages.filter(Boolean));
      if (uploads.length) {
        for (const { path } of uploads) pendingPaths.add(path);
        try {
          // Upload the images and url update
          await uploadFiles({
            files: uploads,
            repo: DatasetRepo,
            branch,
            credentials,
            useWebWorkers: true,
          });
        } finally {
          // Remove the pending paths either way because we'll get new paths
          for (const { path } of uploads) pendingPaths.delete(path);
        }
        console.log(g`${uploads.length} files successfully uploaded`);
      }

      // Add all urls to the known list even if we skipped them
      await uploadKnownUrls(images.map(({ origin }) => origin));
    },
    async (error, retryCount) => {
      if (error.statusCode === 429) {
        // Warn about rate limiting and wait a few minutes
        await wait(RateLimitDelay - HuggingFaceErrorDelay * retryCount);
        const delay = RateLimitDelay / 60 / 1000;
        console.warn(r`Rate-limited, waiting ${delay} mins`);
      } else console.warn(r`Retrying upload after error: ${error.message}`);
    }
  );
}

export async function fetchKnownUrls(branch = MainBranch) {
  const retry = withRetry(RetryLimit, HuggingFaceErrorDelay);
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
      console.warn(r`Retrying url list fetch after error: ${error.message}`);
    }
  );
}

/**
 * @param {(string | URL)[]} urls
 */
export async function uploadKnownUrls(urls, branch = MainBranch) {
  if (!urls.length) return;
  await urlUploadQueue.queue(async () => {
    // Get the current list of urls and the count
    const allUrls = new Set(await fetchKnownUrls(branch));
    const oldSize = allUrls.size;

    // Add the new urls to the set, don't upload if nothing new
    for (const url of urls) allUrls.add(url.toString());
    if (allUrls.size === oldSize) return;

    // Build the url list upload data
    const urlData = new Blob([[...allUrls].join('\n')]);
    const urlsUpload = { path: UrlListPath, content: urlData };

    const retry = withRetry(RetryLimit, HuggingFaceErrorDelay);
    await retry(
      async () => {
        await uploadFile({
          file: urlsUpload,
          repo: DatasetRepo,
          branch,
          credentials,
          useWebWorkers: true,
        });
      },
      (error) => {
        console.warn(r`Retrying url list upload after error: ${error.message}`);
      }
    );
  });
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
