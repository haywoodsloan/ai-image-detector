import { HfInference } from '@huggingface/inference';
import { getImageAsBlob } from '../utilities/image.js';
import { AiClassLabel, AiClassThresh, DetectorModels } from '../constants.js';

/**
 * @type {HfInference}
 */
let _hfInterface;
const hfInterface = () => (_hfInterface ||= new HfInference(process.env.hfKey));

/**
 *
 * @param {string} url
 */
export async function checkIfAI(url) {
  const data = await getImageAsBlob(url);

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
