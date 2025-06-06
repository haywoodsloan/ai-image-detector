import {
  commit,
  deleteFile,
  downloadFile,
  fileExists,
  listCommits,
  listFiles,
  uploadFile,
  uploadFiles,
} from '@huggingface/hub';
import { g, r, rl, y } from 'common/utilities/colors.js';
import { wait } from 'common/utilities/sleep.js';
import { basename, dirname } from 'path';

import TimeSpan from './TimeSpan.js';
import { firstResult, parallel } from './async.js';
import { isRateLimitError } from './error.js';
import { countAsync, take } from './iterable.js';
import { NonRetryableError, withRetry } from './retry.js';
import { isHttpUrl } from './url.js';

export const MainBranch = 'main';
export const DataPath = 'data';
export const UrlListPath = `${DataPath}/urls.txt`;
export const UploadBatchSize = 50;

export const TrainSplit = 'train';
export const TestSplit = 'test';
export const AllSplits = [TrainSplit, TestSplit];

export const RealLabel = 'real';
export const AiLabel = 'artificial';
export const AllLabels = [RealLabel, AiLabel];

const RetryLimit = 10;
const MaxSubsetSize = 10_000;

const UploadDelay = TimeSpan.fromSeconds(1);
const HuggingFaceErrorDelay = TimeSpan.fromSeconds(10);
const RateLimitDelay = TimeSpan.fromMinutes(15);

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

/**
 * @type {Map<string, {
 *   image: HfImage
 *   promise: Promise<void>,
 *   resolve: () => void,
 *   reject: (error: Error) => void
 * }>}
 */
const pendingUploads = new Map();

// Share a retry invoker for all operations
const retry = withRetry(RetryLimit, HuggingFaceErrorDelay);

/**
 * @param {string} fileName
 */
export async function isExistingImage(fileName, branch = MainBranch) {
  return !!(await getFullImagePath(fileName, branch));
}

/**
 * @param {HfImage} image
 */
export async function deleteImage(image, branch = MainBranch) {
  // Error if the files doesn't exists already
  const { fileName } = image;

  // Move the image
  return await retry(
    async () => {
      console.log(y`Deleting image on HF ${fileName}`);
      const head = await getHeadCommit(branch);

      // If there isn't an existing file skip retries and throw
      const oldPath = await getFullImagePath(fileName, head.oid);
      if (!oldPath) {
        const error = new Error('Image to delete missing from HF');
        console.warn(y`${error.message}`);
        throw new NonRetryableError(error);
      }

      await deleteFile({
        path: oldPath,
        repo: DatasetRepo,
        branch,
        credentials,
        useWebWorkers: true,
        title: `Delete image ${oldPath}`,
        parentCommit: head.oid,
      });

      // Add the new image's url
      console.log(y`Successfully deleted image ${oldPath}`);
      await deleteKnownUrl(image.origin, branch);
    },
    (error) => {
      console.warn(rl`Retrying move ${error}`);
    }
  );
}

/**
 * @param {HfImage} image
 */
export async function replaceImage(image, branch = MainBranch) {
  // Error if the files doesn't exists already
  const { fileName, label: newLabel } = image;

  // Move the image
  return await retry(
    async () => {
      console.log(y`Moving image on HF ${fileName}`);
      const head = await getHeadCommit(branch);

      // If there isn't an existing file skip retries and throw
      const oldPath = await getFullImagePath(fileName, head.oid);
      if (!oldPath) {
        const error = new Error('Image to replace missing from HF');
        console.warn(y`${error.message}`);
        throw new NonRetryableError(error);
      }

      // Skip if the old and new labels are the same
      // Return false to indicate no change was made
      const { label: oldLabel } = parsePath(oldPath);
      if (oldLabel === newLabel) return false;

      // Create a new upload for the replacement
      const [upload] = await createUploads([image], head.oid);
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
          parentCommit: head.oid,
        });
      } finally {
        // Remove the pending paths either way because we'll get new paths
        pendingPaths.delete(upload.path);
      }

      // Add the new image's url
      console.log(y`Successfully moved image ${oldPath} => ${upload.path}`);
      await uploadKnownUrls([upload.origin], branch);

      // Return true if successfully replaced
      return true;
    },
    (error) => {
      console.warn(rl`Retrying move ${error}`);
    }
  );
}

/**
 * @param {HfImage[]} images
 */
export async function uploadImages(images, branch = MainBranch) {
  // Skip if no images in the array
  if (!images.length) return;

  // If there aren't any pending uploads well start a new loop
  const shouldRun = !pendingUploads.size;

  // Track the existing pending uploads and what's missing
  const pending = [];
  for (const image of images) {
    const fileName = image.fileName;

    if (pendingUploads.has(fileName)) {
      const { promise } = pendingUploads.get(fileName);
      pending.push(promise);
    } else {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });

      // Add a new pending url
      pending.push(promise);
      pendingUploads.set(fileName, { image, resolve, reject, promise });
    }
  }

  if (shouldRun) {
    // Run an async loop uploading any pending urls
    (async () => {
      await wait(UploadDelay);
      while (pendingUploads.size) {
        // Copy a set of the images to track if some can be skipped
        const newImages = [];
        try {
          // Start a retry loop
          await retry(
            async () => {
              // Track the last commit so we avoid redundant uploads
              const head = await getHeadCommit(branch);

              // capture the current pendingUploads for
              // the secondary url upload after images
              const initialUploads = [
                ...take(pendingUploads.values(), UploadBatchSize),
              ];

              const pendingCt = initialUploads.length;
              console.log(y`Uploading ${pendingCt} image(s) to HF`);

              // Double check that all the images are new
              // A duplicate image may have been added since validation
              newImages.length = 0;
              for (const { resolve, image } of initialUploads) {
                const name = image.fileName;
                if (await isExistingImage(name, head.oid)) {
                  console.log(y`Skipping ${name} [image already on HF]`);
                  pendingUploads.delete(name);
                  resolve();
                } else {
                  newImages.push(image);
                }
              }

              const newCt = newImages.length;
              if (newCt) {
                // Create a set of upload for the image
                // Recreate with each retry incase the folders are now full
                const uploads = await createUploads(newImages, head.oid);

                // If there are new uploads push them to HF
                for (const { path } of uploads) pendingPaths.add(path);
                try {
                  // Upload the images and url update
                  await uploadFiles({
                    files: uploads,
                    repo: DatasetRepo,
                    branch,
                    credentials,
                    useWebWorkers: true,
                    commitTitle: `Add ${newCt} images`,
                    parentCommit: head.oid,
                  });
                } finally {
                  // Remove the pending paths either way because we'll get new paths
                  for (const { path } of uploads) pendingPaths.delete(path);
                }

                const skipCt = pendingCt - newCt;
                console.log(g`${newCt} image(s) uploaded [${skipCt} skipped]`);
              }

              // Add all urls to the known list even if we skipped them
              await uploadKnownUrls(
                initialUploads.map(({ image }) => image.origin),
                branch
              );
            },
            async (error, retryCount) => {
              if (isRateLimitError(error)) {
                // Warn about rate limiting and wait a few minutes
                const delay = RateLimitDelay / 60 / 1000;
                console.warn(r`Rate-limited, waiting ${delay} mins`);
                await wait(RateLimitDelay - HuggingFaceErrorDelay * retryCount);
              } else console.warn(rl`Retrying upload ${error}`);
            }
          );

          // Resolve the uploaded images
          for (const { fileName } of newImages) {
            pendingUploads.get(fileName).resolve();
            pendingUploads.delete(fileName);
          }
        } catch (error) {
          // If the retry failed reject the urls for this upload
          for (const { fileName } of newImages) {
            pendingUploads.get(fileName).reject(error);
            pendingUploads.delete(fileName);
          }
        }
      }
    })();
  }

  // Return a promise that resolves once all the images are uploaded
  return Promise.all(pending);
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
      console.warn(rl`Retrying URL list fetch ${error}`);
    }
  );
}

/**
 * @param {string | URL} url
 */
export async function deleteKnownUrl(url, branch = MainBranch) {
  // Skip data urls
  const validUrl = isHttpUrl(url) ? url.toString() : null;

  // Skip if not a valid url
  if (!validUrl) return;

  await retry(
    async () => {
      // Get the current list of urls from the HEAD
      const head = await getHeadCommit(branch);
      const allUrls = new Set(await fetchKnownUrls(head.oid));
      console.log(y`Deleting ${validUrl} URL from HF`);

      // Don't upload if the url doesn't exist yet
      if (!allUrls.has(validUrl)) {
        console.log(y`Not deleting ${url} [URL not on HF]`);
        return;
      }

      // Filter out the url to delete
      allUrls.delete(validUrl);

      // Build the url list upload data
      const urlData = new Blob([[...allUrls].join('\n')]);
      const urlsUpload = { path: UrlListPath, content: urlData };

      // Upload the new urls requiring the parent commit be
      // the same as the one we fetched the URLs from
      await uploadFile({
        file: urlsUpload,
        repo: DatasetRepo,
        branch,
        credentials,
        useWebWorkers: true,
        commitTitle: `Delete URL ${validUrl}`,
        parentCommit: head.oid,
      });

      console.log(g`URL deleted [${validUrl}]`);
    },
    async (error, retryCount) => {
      if (isRateLimitError(error)) {
        // Warn about rate limiting and wait a few minutes
        const delay = RateLimitDelay / 60 / 1000;
        console.warn(r`Rate-limited, waiting ${delay} mins`);
        await wait(RateLimitDelay - HuggingFaceErrorDelay * retryCount);
      } else console.warn(rl`Retrying URL list upload ${error}`);
    }
  );
}

/**
 * @param {(string | URL)[]} urls
 */
export async function uploadKnownUrls(urls, branch = MainBranch) {
  // Skip data urls
  const validUrls = urls
    .filter((url) => isHttpUrl(url))
    .map((url) => url.toString());

  // Skip if no valid urls are specified
  if (!validUrls.length) return;

  // If there aren't any pending urls well start a new loop
  const shouldRun = !pendingUrls.size;

  // Track the existing pending uploads and what's missing
  const pending = [];
  for (const url of validUrls) {
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
      await wait(UploadDelay);
      while (pendingUrls.size) {
        const newUrls = [];
        try {
          await retry(
            async () => {
              // Get the current list of urls from the HEAD
              const head = await getHeadCommit(branch);
              const allUrls = new Set(await fetchKnownUrls(head.oid));

              const pendingCt = pendingUrls.size;
              console.log(y`Uploading ${pendingCt} URL(s) to HF`);

              // Add the new urls to the set, don't upload if nothing new
              // Reset the list of new urls for each retry
              newUrls.length = 0;
              for (const [url, { resolve }] of pendingUrls) {
                if (allUrls.has(url)) {
                  console.log(y`Skipping ${url} [URL already on HF]`);
                  pendingUrls.delete(url);
                  resolve();
                } else {
                  allUrls.add(url);
                  newUrls.push(url);
                }
              }

              // If no urls are new skip
              const newCt = newUrls.length;
              if (!newCt) return;

              // Build the url list upload data
              const urlData = new Blob([[...allUrls].join('\n')]);
              const urlsUpload = { path: UrlListPath, content: urlData };

              // Upload the new urls requiring the parent commit be
              // the same as the one we fetched the URLs from
              await uploadFile({
                file: urlsUpload,
                repo: DatasetRepo,
                branch,
                credentials,
                useWebWorkers: true,
                commitTitle: `Add ${newCt} URLs`,
                parentCommit: head.oid,
              });

              const skippedCt = pendingCt - newCt;
              console.log(g`${newCt} URL(s) uploaded [${skippedCt} skipped]`);
            },
            async (error, retryCount) => {
              if (isRateLimitError(error)) {
                // Warn about rate limiting and wait a few minutes
                const delay = RateLimitDelay / 60 / 1000;
                console.warn(r`Rate-limited, waiting ${delay} mins`);
                await wait(RateLimitDelay - HuggingFaceErrorDelay * retryCount);
              } else console.warn(rl`Retrying URL list upload ${error}`);
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

        const found = await retry(
          async () => {
            try {
              return await fileExists({
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
            } catch (error) {
              if (error?.name === 'AbortError') return;
              throw error;
            }
          },
          async (error, retryCount) => {
            if (isRateLimitError(error)) {
              // Warn about rate limiting and wait a few minutes
              const delay = RateLimitDelay / 60 / 1000;
              console.warn(r`Rate-limited, waiting ${delay} mins`);
              await wait(RateLimitDelay - HuggingFaceErrorDelay * retryCount);
            } else console.warn(rl`Retrying check if image exists ${error}`);
          }
        );

        if (found) return filePath;
      });
    });
  });

  abort.abort();
  return result;
}

export async function getImageCount(branch = MainBranch) {
  let count = 0;
  for (const split of AllSplits) {
    const sets = listFiles({
      path: `${DataPath}/${split}`,
      repo: DatasetRepo,
      revision: branch,
      credentials,
    });

    await parallel(
      sets,
      async (set) => {
        if (set.type !== 'directory') return;
        for (const label of AllLabels) {
          try {
            const images = listFiles({
              path: `${set.path}/${label}`,
              repo: DatasetRepo,
              revision: branch,
              credentials,
            });

            while (!(await images.next()).done) count++;
          } catch (error) {
            // If it's a 404 error then there
            // isn't a set for that label yet
            if (error.statusCode !== 404) throw error;
          }
        }
      },
      8
    );
  }

  return count;
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
  /**
   * @type {{[key: string]: {
   *    [key: string]: {idx: number, cnt: number},
   *    setCnt: number
   * }}}
   */
  const subsets = {
    [TrainSplit]: {
      [AiLabel]: { idx: -1, cnt: 0 },
      [RealLabel]: { idx: -1, cnt: 0 },
      setCnt: -1,
    },
    [TestSplit]: {
      [AiLabel]: { idx: -1, cnt: 0 },
      [RealLabel]: { idx: -1, cnt: 0 },
      setCnt: -1,
    },
  };

  /** @type {HfUpload[]} */
  const uploadsWithPath = [];
  for (const upload of uploads) {
    const { fileName, split, label } = upload;

    const splitSets = subsets[split];
    if (splitSets.setCnt === -1) {
      const sets = listFiles({
        path: `${DataPath}/${split}`,
        repo: DatasetRepo,
        revision: branch,
        credentials,
      });

      splitSets.setCnt = await countAsync(
        sets,
        ({ type }) => type === 'directory'
      );
    }

    // If we haven't figured out the current
    // subset for this split and label find it
    const subset = subsets[split][label];
    if (subset.idx === -1) {
      for (let i = splitSets.setCnt - 1; i >= 0; i--) {
        const prefix = buildPath(split, label, i);
        try {
          const images = listFiles({
            path: prefix,
            repo: DatasetRepo,
            revision: branch,
            credentials,
          });

          const existingCnt = await countAsync(
            images,
            ({ type }) => type === 'file'
          );

          const pendingCnt = [...pendingPaths].filter((path) =>
            path.startsWith(prefix)
          ).length;

          const imgCnt = existingCnt + pendingCnt;
          if (imgCnt < MaxSubsetSize) {
            subset.cnt = imgCnt;
            subset.idx = i;
          } else {
            subset.idx = i + 1;
          }

          break;
        } catch (error) {
          // If a 404 the subset doesn't have any images for that label
          if (error?.statusCode === 404) continue;
          throw error;
        }
      }
    }

    // Add the path to the open subset to the upload
    const path = buildPath(split, label, subset.idx, fileName);
    uploadsWithPath.push({ ...upload, path });

    // Also track the subset count
    subset.cnt++;
    if (subset.cnt >= MaxSubsetSize) {
      subset.idx++;
      subset.cnt = 0;
    }
  }

  return uploadsWithPath;
}

async function getHeadCommit(branch = MainBranch) {
  /** @type {{value: CommitData}} */
  const { value: head } = await listCommits({
    repo: DatasetRepo,
    revision: branch,
    batchSize: 1,
    credentials,
  }).next();
  return head;
}
