import { post } from './base.js';

const ImageAnalysisEndpoint = '/imageAnalysis';

/**
 * @param {string} url
 * @param {{signal?: AbortSignal}}
 * @returns {Promise<ImageAnalysis>}
 */
export async function analyzeImage(url, { signal } = {}) {
  return await post(ImageAnalysisEndpoint, { url }, signal);
}
