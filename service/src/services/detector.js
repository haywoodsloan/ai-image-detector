import TimeSpan from 'common/utilities/TimeSpan.js';
import {
  AiLabel,
  getImageClassification,
} from 'common/utilities/huggingface.js';
import { withRetry } from 'common/utilities/retry.js';
import { l } from 'common/utilities/string.js';

// Use the detector version for db lookups
export const DetectorVersion = '1';
export const DetectorModels = Object.freeze([
  'haywoodsloan/autotrain-ai-image-detect-20241022-0241',
]);

const DetectorErrorDelay = TimeSpan.fromMilliseconds(100);
const DetectorRetryLimit = 3;
const retry = withRetry(DetectorRetryLimit, DetectorErrorDelay);

/**
 * @param {Buffer} data
 * @param {string} hash
 */
export async function classifyIfAi(data) {
  // Check several AI related classifications
  const results = await Promise.all(
    DetectorModels.map((model) =>
      retry(
        () => getImageClassification({ model, data }),
        (error) => console.log(l`Retrying detector request ${error}`)
      )
    )
  );

  // Take the average AI classification score from all results
  const aiScores = results
    .flat()
    .filter(({ label }) => label === AiLabel)
    .map(({ score }) => score);

  return aiScores.reduce((sum, score) => sum + score, 0) / aiScores.length;
}
