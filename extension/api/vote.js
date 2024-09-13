import { post } from './base.js';

const VoteImageLabelEndpoint = '/voteImageLabel';
const DeleteImageVoteEndpoint = '/deleteImageVote';

/**
 * @param {string} url
 * @param {LabelType} voteLabel
 * @returns {Promise<ImageVote>}
 */
export function voteImageLabel(url, voteLabel, skipUpload = false) {
  return post(VoteImageLabelEndpoint, { url, voteLabel, skipUpload });
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
export function deleteImageVote(url, skipUpload = false) {
  return post(DeleteImageVoteEndpoint, { url, skipUpload });
}
