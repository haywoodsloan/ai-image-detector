import { HfInference } from '@huggingface/inference';
import memoize from 'memoize';

import { hashImage } from '../utilities/hash.js';
import { queryVotedClass } from './db/voteColl.js';

export const RealClassLabel = 'real';
export const AiClassLabel = 'artificial';
export const AiClassThresh = 0.95;

// Use the detector version for db lookups
export const DetectorVersion = '1';
export const DetectorModels = Object.freeze([
  'haywoodsloan/autotrain-ai-image-detect-20240525-0312',
]);

const getHfInterface = memoize(() => new HfInference(process.env.hfKey));

/**
 * @param {Buffer} data
 */
export async function checkIfAI(data) {
  // Create a hash to for DB storage
  const hash = hashImage(data);

  // Check for a cached class from the DB
  const cachedClass = await queryVotedClass(hash);
  if (cachedClass) {
    return cachedClass === AiClassLabel;
  }

  // Check several AI related classifications
  const hfInterface = getHfInterface();
  const results = await Promise.all(
    DetectorModels.map((model) =>
      hfInterface.imageClassification({ model, data })
    )
  );

  return results
    .flat()
    .some(
      ({ label, score }) => label === AiClassLabel && score >= AiClassThresh
    );
}
