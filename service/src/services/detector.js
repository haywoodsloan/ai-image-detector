import { HfInference } from '@huggingface/inference';

import { getImageAsBlob } from '../utilities/image.js';

export const AiClassLabel = 'artificial';
export const AiClassThresh = 0.95;

export const DetectorModels = Object.freeze([
  'haywoodsloan/autotrain-ai-image-detect',
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

  // Check several AI related classifications
  const classifications = await Promise.all(
    DetectorModels.map((model) =>
      hfInterface().imageClassification({ model, data })
    )
  );

  // Return true if any classify as an AI
  return classifications
    .flat()
    .some(
      ({ label, score }) => label === AiClassLabel && score >= AiClassThresh
    );
}
