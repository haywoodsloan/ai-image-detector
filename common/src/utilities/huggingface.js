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
import { firstResult } from './async.js';

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
 *
 * @param {string} split
 * @param {string} label
 * @param {string} fileName
 * @param {{branch?: string, pendingPaths?: string[]}} options
 */
export async function getPathForImage(
  split,
  label,
  fileName,
  { branch = MainBranch, pendingPaths = [] } = {}
) {
  let subsetIdx;
  for (subsetIdx = 0; ; subsetIdx++) {
    const subset = `set-${String(subsetIdx).padStart(3, '0')}`;
    const path = `${DataPath}/${split}/${subset}/${label}`;

    // Check how many images are in the folder
    let images;
    try {
      images = listFiles({
        path,
        repo: DatasetRepo,
        revision: branch,
        credentials,
      });
    } catch {
      // If the list fails this subset is new
      break;
    }

    // Start the count with the number of
    // pending uploads for this path
    let count = pendingPaths.filter((pending) =>
      path.startsWith(pending)
    ).length;

    // Add any found images to the cache
    for await (const image of images) {
      if (image.type === 'file') count++;
    }

    // Use this subset if the count isn't at max
    if (count < MaxSubsetSize) break;
  }

  // Create a path using the open subset, track in the cache
  const subset = `set-${String(subsetIdx).padStart(3, '0')}`;
  return `${DataPath}/${split}/${subset}/${label}/${fileName}`;
}

/**
 * @param {Upload} file
 */
export async function replaceWithRetry(file, branch = MainBranch) {
  // Error if the files doesn't exists already
  const fileName = basename(file.path);
  const oldPath = await getFullImagePath(fileName);
  if (!oldPath) throw new Error('File to replace missing from HF');

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
      const labels = listFiles({
        path: subset.path,
        repo: DatasetRepo,
        revision: branch,
        credentials,
      });

      return await firstResult(labels, async (label) => {
        if (label.type !== 'directory') return;
        const filePath = `${label.path}/${fileName}`;

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
function parseImagePath(path) {
  const labelDir = dirname(path);
  const label = basename(labelDir);

  const subsetDir = dirname(labelDir);
  const subset = basename(subsetDir);
  const subsetIdx = Number(subset.substring(subset.indexOf('-') + 1));

  const splitDir = dirname(subsetDir);
  const split = basename(splitDir);

  return { split, label, subset, subsetIdx };
}
