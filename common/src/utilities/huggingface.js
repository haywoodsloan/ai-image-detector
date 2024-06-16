import {
  deleteFile,
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

import { TimeSpan } from './TimeSpan.js';

export const MainBranch = 'main';
export const DataPath = 'data';

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

/** @type {Map<string, string>} */
const existingImages = new Map();

/** @type {{[key: string]: {[key: string]: number[]}}} */
const subsetCounts = {
  [TrainSplit]: {
    [RealLabel]: [0],
    [AiLabel]: [0],
  },
  [TestSplit]: {
    [RealLabel]: [0],
    [AiLabel]: [0],
  },
};

const getHfInterface = memoize(
  () => new HfInference(credentials?.accessToken),
  { cacheKey: () => credentials?.accessToken }
);

export const preloadExistingImages = memoize(
  /** @param {string} branch */
  async (branch = MainBranch) => {
    // Check all files in the data folder
    const files = listFiles({
      path: DataPath,
      repo: DatasetRepo,
      revision: branch,
      recursive: true,
      credentials,
    });

    // Track all files and subset counts
    for await (const file of files) {
      if (file.type !== 'file') continue;
      existingImages.set(basename(file.path), file.path);

      const { split, label, subsetIdx } = parseImagePath(file.path);
      incrementSubsetCount(split, label, subsetIdx);
    }
  }
);

/**
 * @param {string} fileName
 */
export async function isExistingImage(
  fileName,
  { branch = MainBranch, skipCache = false } = {}
) {
  // If using the cache, preload then check stored images
  if (!skipCache) {
    await preloadExistingImages(branch);
    return existingImages.has(fileName);
  }

  // If not using the cache, check all splits/labels/subsets
  for (const split of AllSplits) {
    const subsets = listFiles({
      path: `${DataPath}/${split}`,
      repo: DatasetRepo,
      revision: branch,
      credentials,
    });

    for await (const subset of subsets) {
      if (subset.type !== 'directory') continue;
      const labels = listFiles({
        path: subset.path,
        repo: DatasetRepo,
        revision: branch,
        credentials,
      });

      for await (const label of labels) {
        if (label.type !== 'directory') continue;
        const filePath = `${label.path}/${fileName}`;
        const exists = await fileExists({
          path: filePath,
          repo: DatasetRepo,
          revision: branch,
          credentials,
        });

        if (exists) {
          existingImages.set(fileName, filePath);
          return true;
        }
      }
    }
  }

  // If the image couldn't be found remove it from the cache
  existingImages.delete(fileName);
  return false;
}

/**
 *
 * @param {string} split
 * @param {string} label
 * @param {string} fileName
 */
export async function getPathForImage(
  split,
  label,
  fileName,
  { branch = MainBranch, skipCache = false } = {}
) {
  let subsetIdx;
  if (!skipCache) {
    // If using the cache, preload then find the first subset with room
    await preloadExistingImages(branch);
    const subsets = subsetCounts[split][label];
    subsetIdx = subsets.findIndex((size) => size < MaxSubsetSize);
    if (subsetIdx === -1) subsetIdx = subsets.length;
  } else {
    // If not using the cache, check existing subsets
    for (subsetIdx = 0; ; subsetIdx++) {
      const subset = `set-${String(subsetIdx).padStart(3, '0')}`;
      const path = `${DataPath}/${split}/${subset}/${label}`;

      try {
        const images = listFiles({
          path,
          repo: DatasetRepo,
          revision: branch,
          credentials,
        });

        // Add any found images to the cache
        for await (const image of images) {
          if (image.type !== 'file') continue;
          incrementSubsetCount(split, label, subsetIdx);
          existingImages.set(basename(image.path), image.path);
        }

        // Move to the next subset once the count is at max
        const subsetCount = subsetCounts[split][label][subsetIdx];
        if (subsetCount < MaxSubsetSize) break;
      } catch {
        break;
      }
    }
  }

  // Create a path using the open subset, track in the cache
  incrementSubsetCount(split, label, subsetIdx);
  const subset = `set-${String(subsetIdx).padStart(3, '0')}`;
  const path = `${DataPath}/${split}/${subset}/${label}/${fileName}`;

  existingImages.set(fileName, path);
  return path;
}

/**
 * @param {string} path
 */
export function releaseImagePath(path) {
  existingImages.delete(basename(path));
  const { split, label, subsetIdx } = parseImagePath(path);
  decrementSubsetCount(split, label, subsetIdx);
}

/**
 * @param {Upload} file
 */
export async function replaceWithRetry(file, branch = MainBranch) {
  // Error if the files doesn't exists already
  const fileName = basename(file.path);
  const oldPath = existingImages.get(fileName);
  if (!oldPath) throw new Error('File to move missing from HF');

  // Skip if the old and new labels are the same
  const { label: oldLabel } = parseImagePath(oldPath);
  const { label: newLabel } = parseImagePath(file.path);

  if (oldLabel === newLabel) return false;
  console.log(y`Moving file on HF: ${oldPath} => ${file.path}`);

  // First delete the old image
  let retryCount = 0;
  while (true) {
    try {
      await deleteFile({
        branch,
        repo: DatasetRepo,
        credentials,
        path: oldPath,
      });

      console.log(y`Successfully deleted old file: ${oldPath}`);
      break;
    } catch (error) {
      if (retryCount < RetryLimit) {
        // Retry after a few seconds for other errors
        retryCount++;
        console.warn(r`Retrying delete after error: ${error.message}`);
        await wait(HuggingFaceErrorDelay * retryCount);
      } else throw error;
    }
  }

  // Next upload the new image
  retryCount = 0;
  while (true) {
    try {
      await uploadFile({
        file,
        repo: DatasetRepo,
        branch,
        credentials,
        useWebWorkers: true,
      });

      console.log(g`Successfully moved file: ${file.path}`);
      break;
    } catch (error) {
      if (retryCount < RetryLimit) {
        // Retry after a few seconds for other errors
        retryCount++;
        console.warn(r`Retrying upload after error: ${error.message}`);
        await wait(HuggingFaceErrorDelay * retryCount);
      } else throw error;
    }
  }

  // Update the cache
  existingImages.set(fileName, file.path);
  return true;
}

/**
 * @param {Upload[]} files
 */
export async function uploadWithRetry(files, branch = MainBranch) {
  // Filter out invalid images
  if (!files.length) return;
  console.log(y`Uploading ${files.length} files to HF`);

  // Start a retry loop
  let retryCount = 0;
  while (true) {
    try {
      await uploadFiles({
        branch,
        useWebWorkers: true,
        repo: DatasetRepo,
        credentials,
        files,
      });

      console.log(g`${files.length} files successfully uploaded`);
      break;
    } catch (error) {
      if (error.statusCode === 429) {
        // Warn about rate limiting and wait a few minutes
        const delay = RateLimitDelay / 60 / 1000;
        console.warn(r`Rate-limited, waiting ${delay} mins`);
        await wait(RateLimitDelay);
      } else if (retryCount < RetryLimit) {
        // Retry after a few seconds for other errors
        retryCount++;
        console.warn(r`Retrying upload after error: ${error.message}`);
        await wait(HuggingFaceErrorDelay * retryCount);
      } else throw error;
    }
  }
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
 * @param {string} split
 * @param {string} label
 * @param {number} subsetIdx
 */
function incrementSubsetCount(split, label, subsetIdx, increment = 1) {
  const subsets = subsetCounts[split][label];
  if (subsets[subsetIdx]) {
    subsets[subsetIdx] += increment;
  } else {
    subsets[subsetIdx] = increment;
  }
}

/**
 * @param {string} split
 * @param {string} label
 * @param {number} subsetIdx
 */
function decrementSubsetCount(split, label, subsetIdx, decrement = 1) {
  const subsets = subsetCounts[split][label];
  if (subsets[subsetIdx]) subsets[subsetIdx] -= decrement;
}

/**
 * @param {string} path
 */
function parseImagePath(path) {
  const labelDir = dirname(path);
  const label = basename(labelDir);

  const subsetDir = dirname(labelDir);
  const subset = basename(subsetDir);
  const subsetIdx = Number(subset.substring(subset.indexOf('-') + 1));

  const splitDir = dirname(subsetDir);
  const split = basename(splitDir);

  return { split, label, subsetIdx };
}
