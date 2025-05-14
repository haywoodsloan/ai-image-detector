import { post } from './base.js';

const ImageAnalysisEndpoint = '/imageAnalysis';

/**
 * @param {string} url
 * @param {{signal?: AbortSignal, referer?: string}}
 * @returns {Promise<ImageAnalysis>}
 */
export async function analyzeImage(url, { signal, referer } = {}) {
  return await post(
    ImageAnalysisEndpoint,
    { url, ...(referer && { referer }) },
    signal
  );
}
