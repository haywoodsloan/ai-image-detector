import { listFiles, uploadFiles } from '@huggingface/hub';
import { HfInference } from '@huggingface/inference';
import { g, r, y } from 'common/utilities/colors.js';
import { wait } from 'common/utilities/sleep.js';
import memoize from 'memoize';
import { basename, dirname } from 'path';

export const MainBranch = 'main';
export const DataPath = 'data';
export const TrainSplit = 'train';
export const TestSplit = 'test';

export const RealLabel = 'real';
export const AiLabel = 'artificial';
export const AllLabels = [RealLabel, AiLabel];

const RetryLimit = 10;
const MaxSubsetSize = 10_000;

const HuggingFaceErrorDelay = 10 * 1000;
const RateLimitDelay = 10 * 60 * 1000;

const DatasetRepo = { name: 'haywoodsloan/ai-images', type: 'dataset' };

/** @type {{accessToken: string}} */
const credentials = {};

/** @type {Set<string>} */
const existingImages = new Set();

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
    const files = listFiles({
      path: DataPath,
      repo: DatasetRepo,
      revision: branch,
      recursive: true,
      credentials,
    });

    for await (const file of files) {
      if (file.type !== 'file') continue;
      existingImages.add(basename(file.path));

      const { split, label, subsetIdx } = parseImagePath(file.path);
      incrementSubsetCount(split, label, subsetIdx);
    }
  }
);

/**
 * @param {string} fileName
 */
export async function isExistingImage(fileName, branch = MainBranch) {
  await preloadExistingImages(branch);
  return existingImages.has(fileName);
}

/**
 * @param {string} fileName
 */
export function addFoundImage(fileName) {
  existingImages.add(fileName);
}

/**
 *
 * @param {string} split
 * @param {string} label
 * @param {string} fileName
 */
export async function getPathForImage(split, label, fileName, branch = MainBranch) {
  await preloadExistingImages(branch);
  const subsets = subsetCounts[split][label];
  let subsetIdx = subsets.findIndex((size) => size < MaxSubsetSize);

  if (subsetIdx === -1) subsetIdx = subsets.length;
  const subset = `set-${String(subsetIdx).padStart(3, '0')}`;

  incrementSubsetCount(split, label, subsetIdx);
  return `${DataPath}/${split}/${subset}/${label}/${fileName}`;
}

/**
 * @param {string} path
 */
export function releaseImagePath(path) {
  const { split, label, subsetIdx } = parseImagePath(path);
  decrementSubsetCount(split, label, subsetIdx);
}

/**
 * @param {ValidatedUpload[]} files
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
        console.warn(r`Retrying after error: ${error.message}`);
        await wait(HuggingFaceErrorDelay * retryCount);
      } else {
        // If not a known error re-throw
        throw error;
      }
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
