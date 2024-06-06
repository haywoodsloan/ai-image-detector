import { HfInference } from '@huggingface/inference';
import { createHash } from 'crypto';
import memoize from 'memoize';

import { retrieveImageClass, storeImageClass } from './db.js';

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
  const hash = createHash('sha1').update(data).digest('base64');

  // Check for a cached class from the DB
  const cachedClass = await retrieveImageClass(hash);
  if (cachedClass) {
    return cachedClass === AiClassLabel;
  }

  // Check several AI related classifications
  const hfInterface = getHfInterface();
  const classifications = await Promise.all(
    DetectorModels.map((model) =>
      hfInterface.imageClassification({ model, data })
    )
  );

  const isAI = classifications
    .flat()
    .some(
      ({ label, score }) => label === AiClassLabel && score >= AiClassThresh
    );

  await storeImageClass(hash, isAI ? AiClassLabel : RealClassLabel);
  return isAI;
}
