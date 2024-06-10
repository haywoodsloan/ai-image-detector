import { HfInference } from '@huggingface/inference';
import memoize from 'memoize';

import { hashImage } from '../utilities/hash.js';
import { queryVotedClass } from './db/voteColl.js';

export const RealClassLabel = 'real';
export const AiClassLabel = 'artificial';

// Use the detector version for db lookups
export const DetectorVersion = '1';
export const DetectorModels = Object.freeze([
  'haywoodsloan/autotrain-ai-image-detect-20240607-0006',
]);

const getHfInterface = memoize(() => new HfInference(process.env.hfKey));

/**
 * @param {Buffer} data
 * @param {string} hash
 */
export async function checkIfAI(data, hash = hashImage(data)) {
  // Check for a cached class from the DB
  const cachedClass = await queryVotedClass(hash);
  switch (cachedClass) {
    case AiClassLabel:
      return 1;
    case RealClassLabel:
      return 0;
  }

  // Check several AI related classifications
  const hfInterface = getHfInterface();
  const results = await Promise.all(
    DetectorModels.map((model) =>
      hfInterface.imageClassification({ model, data })
    )
  );

  // Take the average AI classification score from all results
  const aiScores = results
    .flat()
    .filter(({ label }) => label === AiClassLabel)
    .map(({ score }) => score);

  return aiScores.reduce((sum, score) => sum + score) / aiScores.length;
}
