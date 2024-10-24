import { post } from './base.js';

const ImageAnalysisEndpoint = '/imageAnalysis';

/**
 * @param {string} url
 * @param {{signal?: AbortSignal}}
 * @returns {Promise<ImageAnalysis>}
 */
export function analyzeImage(url, { signal } = {}) {
  return post(ImageAnalysisEndpoint, { url }, signal);
}
