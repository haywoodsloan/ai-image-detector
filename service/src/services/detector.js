import TimeSpan from 'common/utilities/TimeSpan.js';
import { isProd } from 'common/utilities/environment.js';
import {
  AiLabel,
  getImageClassification,
} from 'common/utilities/huggingface.js';
import { getMime } from 'common/utilities/image.js';
import { withRetry } from 'common/utilities/retry.js';
import { l } from 'common/utilities/string.js';
import ExpiryMap from 'expiry-map';

const DetectorErrorDelay = TimeSpan.fromMilliseconds(100);
const DetectorRetryLimit = 3;

// TODO switch back to dedicated endpoint once we can afford the infra
// const DetectorEndpoint = isProd
//   ? 'https://l4prxnh8kws35wza.us-east-1.aws.endpoints.huggingface.cloud'
//   : 'https://nse89rlz4y7av5w7.us-east-1.aws.endpoints.huggingface.cloud';

const DetectorModel = isProd
  ? 'haywoodsloan/ai-image-detector-deploy'
  : 'haywoodsloan/ai-image-detector-dev-deploy';

/** @type {ExpiryMap<string, number>} */
const AnalysisCache = new ExpiryMap(TimeSpan.fromMinutes(15).valueOf());
const retry = withRetry(DetectorRetryLimit, DetectorErrorDelay);

/**
 * @param {Buffer} data
 * @param {string} hash
 */
export async function classifyIfAi(data, hash) {
  if (AnalysisCache.has(hash)) return AnalysisCache.get(hash);

  // Check several AI related classifications
  const results = await retry(
    async () =>
      getImageClassification(
        { data, model: DetectorModel /* endpointUrl: DetectorEndpoint */ },
        { fetch: buildFetch(await getMime(data)) }
      ),
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
 * @param {string} contentType
 */
function buildFetch(contentType) {
  /**
   * @param {string | URL | Request} input
   * @param {RequestInit} init
   */
  return (input, init) =>
    fetch(input, {
      ...init,
      headers: { ...init?.headers, 'Content-Type': contentType },
    });
}
