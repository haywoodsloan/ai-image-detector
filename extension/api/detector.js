import { post } from './base.js';

const ImageAnalysisEndpoint = '/imageAnalysis';

/**
 * @param {string} url
 * @returns {Promise<ImageAnalysis>}
 */
export function analyzeImage(url) {
  return post(ImageAnalysisEndpoint, { url });
}
