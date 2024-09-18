import { del, post } from './base.js';

const ImageVoteEndpoint = '/imageVote';

/**
 * @param {string} url
 * @param {LabelType} voteLabel
 * @returns {Promise<ImageVote>}
 */
export function voteImageLabel(url, voteLabel, skipUpload = false) {
  return post(ImageVoteEndpoint, { url, voteLabel, skipUpload });
}

/**
 * @param {string} voteId
 * @returns {Promise<void>}
 */
export function deleteImageVote(voteId) {
  return del(`${ImageVoteEndpoint}/${voteId}`);
}
