import { post } from './base.js';

const CheckImageEndpoint = '/checkImage';

/**
 * @param {string} url
 * @returns {Promise<ImageAnalysis>}
 */
export function checkImage(url) {
  return post(CheckImageEndpoint, {url});
}