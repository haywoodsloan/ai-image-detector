import {
  AiLabel,
  getImageClassification,
} from 'common/utilities/huggingface.js';

// Use the detector version for db lookups
export const DetectorVersion = '1';
export const DetectorModels = Object.freeze([
  'haywoodsloan/autotrain-ai-image-detect-20240716-0057',
]);

/**
 * @param {Buffer} data
 * @param {string} hash
 */
export async function classifyIfAi(data) {
  // Check several AI related classifications
  const results = await Promise.all(
    DetectorModels.map((model) => getImageClassification({ model, data }))
  );

  // Take the average AI classification score from all results
  const aiScores = results
    .flat()
    .filter(({ label }) => label === AiLabel)
    .map(({ score }) => score);

  return aiScores.reduce((sum, score) => sum + score) / aiScores.length;
}
