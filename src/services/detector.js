import { HfInference } from '@huggingface/inference';
import { getImageAsBlob } from '../utilities/image.js';

const aiLabel = 'artificial';

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
  // Check several AI related classifications
  const classifications = await Promise.all([
    hfInterface().imageClassification({
      model: 'umm-maybe/AI-image-detector',
      data: await getImageAsBlob(url),
    }),
    // hfInterface().imageClassification({
    //   model: 'Organika/sdxl-detector',
    //   data: await getImageAsBlob(url),
    // }),
  ]);

  // Return true if any classify as an AI
  return classifications
    .flat()
    .some(({ label, score }) => label === aiLabel && score >= 0.9);
}
