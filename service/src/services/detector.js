import { AiLabel, RealLabel, getImageClassification } from 'common/utilities/huggingface.js';

import { hashImage } from 'common/utilities/hash.js';
import { queryVotedLabel } from './db/voteColl.js';

// Use the detector version for db lookups
export const DetectorVersion = '1';
export const DetectorModels = Object.freeze([
  'haywoodsloan/autotrain-ai-image-detect-20240607-0006',
]);

/**
 * @param {Buffer} data
 * @param {string} hash
 */
export async function checkIfAI(data, hash = hashImage(data)) {
  // Check for a cached class from the DB
  const cachedClass = await queryVotedLabel(hash);
  switch (cachedClass) {
    case AiLabel:
      return 1;
    case RealLabel:
      return 0;
  }

  // Check several AI related classifications
  const results = await Promise.all(
    DetectorModels.map((model) =>
      getImageClassification({ model, data })
    )
  );

  // Take the average AI classification score from all results
  const aiScores = results
    .flat()
    .filter(({ label }) => label === AiLabel)
    .map(({ score }) => score);

  return aiScores.reduce((sum, score) => sum + score) / aiScores.length;
}
