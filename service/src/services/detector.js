import { DefaultAzureCredential } from '@azure/identity';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { AiLabel } from 'common/utilities/huggingface.js';
import { optimizeImage } from 'common/utilities/image.js';
import { withRetry } from 'common/utilities/retry.js';
import { l } from 'common/utilities/string.js';
import ExpiryMap from 'expiry-map';
import memoize from 'memoize';

const DetectorCreds = new DefaultAzureCredential();
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
  data = await optimizeImage(data);
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
  const response = await fetch(`${process.env.INFERENCE_API}`, {
    method: 'POST',
    body: data,
    headers: { Authorization: `Bearer ${await getDetectorToken()}` },
  });

  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}

const getDetectorToken = memoize(
  async () => {
    const scope = `api://${process.env.INFERENCE_REG_ID}/.default`;
    return (await DetectorCreds.getToken(scope)).token;
  },
  { maxAge: TimeSpan.fromMinutes(45) }
);
