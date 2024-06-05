import { HfInference } from '@huggingface/inference';
import { createHash } from 'crypto';

import { getImageAsBlob } from '../utilities/image.js';
import { getImageClass, setImageClass } from './db.js';

export const RealClassLabel = 'real';
export const AiClassLabel = 'artificial';
export const AiClassThresh = 0.95;

// Use the detector version for db lookups
export const DetectorVersion = '1';
export const DetectorModels = Object.freeze([
  'haywoodsloan/autotrain-ai-image-detect-20240525-0312',
]);

/**
 * @type {HfInference}
 */
let _hfInterface;
const hfInterface = () => (_hfInterface ||= new HfInference(process.env.hfKey));

/**
 * @param {string} uri
 */
export async function checkIfAI(uri) {
  const data = await getImageAsBlob(uri);
  const hash = createHash('sha1')
    .update(Buffer.from(await data.arrayBuffer()))
    .digest('base64');

  // Check for a cached class from the DB
  const cachedClass = await getImageClass(hash);
  if (cachedClass) {
    return cachedClass === AiClassLabel;
  }

  // Check several AI related classifications
  const classifications = await Promise.all(
    DetectorModels.map((model) =>
      hfInterface().imageClassification({ model, data })
    )
  );

  const isAI = classifications
    .flat()
    .some(
      ({ label, score }) => label === AiClassLabel && score >= AiClassThresh
    );

  await setImageClass(hash, isAI ? AiClassLabel : RealClassLabel);
  return isAI;
}
