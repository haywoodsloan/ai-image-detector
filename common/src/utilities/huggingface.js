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

/** @type {Set<string>} */
const pendingPaths = new Set();

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

  const [upload] = await createUploads([image], branch);
  console.log(y`Moving file on HF: ${oldPath} => ${upload.path}`);
  pendingPaths.add(upload.path);

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
        file: upload,
        repo: DatasetRepo,
        branch,
        credentials,
        useWebWorkers: true,
      });

      console.log(g`Successfully moved file: ${upload.path}`);
      pendingPaths.delete(upload.path);

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
  const uploads = await createUploads(images);
  for (const { path } of uploads) pendingPaths.add(path);

  // Start a retry loop
  let retryCount = 0;
  while (true) {
    try {
      await uploadFiles({
        files: uploads,
        repo: DatasetRepo,
        branch,
        credentials,
        useWebWorkers: true,
      });

      console.log(g`${images.length} files successfully uploaded`);
      for (const { path } of uploads) pendingPaths.delete(path);

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
