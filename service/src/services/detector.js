import TimeSpan from 'common/utilities/TimeSpan.js';
import { AiLabel } from 'common/utilities/huggingface.js';
import { withRetry } from 'common/utilities/retry.js';
import { l } from 'common/utilities/string.js';
import ExpiryMap from 'expiry-map';

const DetectorErrorDelay = TimeSpan.fromMilliseconds(100);
const DetectorRetryLimit = 3;

/** @type {ExpiryMap<string, number>} */
const AnalysisCache = new ExpiryMap(TimeSpan.fromMinutes(15).valueOf());
const retry = withRetry(DetectorRetryLimit, DetectorErrorDelay);

/**
 * @param {Buffer} data
 * @param {string} hash
 */
export async function classifyIfAi(data, hash) {
  if (AnalysisCache.has(hash)) {
    const result = AnalysisCache.get(hash);
    AnalysisCache.set(hash, result);
    return result;
  }

  // Check several AI related classifications
  const results = await retry(
    async () => invokeModel(data),
    (error) => console.log(l`Retrying detector request ${error}`)
  );

  // Take the average AI classification score from all results
  const aiScores = results
    .flat()
    .filter(({ label }) => label === AiLabel)
    .map(({ score }) => score);

  const finalScore =
    aiScores.reduce((sum, score) => sum + score, 0) / aiScores.length;

  AnalysisCache.set(hash, finalScore);
  return finalScore;
}

/**
 * @param {Buffer} data
 * @returns {ImageClassificationOutput}
 */
async function invokeModel(data) {
  const response = await fetch(
    `${process.env.INFERENCE_API}?code=${process.env.INFERENCE_KEY}`,
    { method: 'POST', body: data }
  );

  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}
