import { listFiles, uploadFiles } from '@huggingface/hub';
import colors from 'cli-color';
import { wait } from 'common/utilities/sleep.js';
import { basename } from 'path';

/**
 * @typedef {{
 *  path: string,
 *  content: URL
 * }} Upload
 */

const RetryLimit = 10;

const HuggingFaceErrorDelay = 10 * 1000;
const RateLimitDelay = 10 * 60 * 1000;

const DatasetRepo = { name: 'haywoodsloan/ai-images', type: 'dataset' };

/** @type {{accessToken: string}} */
let credentials = {};

/**
 * @param {string[]} paths
 */
export async function getHfFileNames(paths) {
  const names = new Set();

  await Promise.all(
    paths.map(async (path) => {
      const files = listFiles({ path, credentials, repo: DatasetRepo });
      for await (const file of files) {
        names.add(basename(file.path));
      }
    })
  );

  return names;
}

/**
 * @param {Upload[]} files
 */
export async function uploadWithRetry(files) {
  // Filter out invalid images
  if (!files.length) return;
  console.log(colors.yellow(`Uploading ${files.length} files to HF`));

  // Start a retry loop
  let retryCount = 0;
  while (true) {
    try {
      await uploadFiles({
        useWebWorkers: true,
        repo: DatasetRepo,
        credentials,
        files,
      });
      console.log(colors.green('Upload to HF succeeded'));
      break;
    } catch (error) {
      if (error.statusCode === 429) {
        // Warn about rate limiting and wait a few minutes
        const delay = RateLimitDelay / 60 / 1000;
        console.warn(colors.red(`Rate-limited, waiting ${delay} mins`));
        await wait(RateLimitDelay);
      } else if (retryCount < RetryLimit) {
        // Retry after a few seconds for other errors
        retryCount++;
        console.warn(colors.red(`Retrying after error: ${error.message}`));
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
  credentials = { accessToken: hfToken };
}
