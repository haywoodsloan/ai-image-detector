import { del, post } from './base.js';

const ImageVoteEndpoint = '/imageVote';

/**
 * @param {string} url
 * @param {LabelType} voteLabel
 * @param {{skipUpload?: boolean, signal?: AbortSignal}}
 * @returns {Promise<ImageVote>}
 */
export function voteImageLabel(
  url,
  voteLabel,
  { skipUpload = false, signal } = {}
) {
  return post(ImageVoteEndpoint, { url, voteLabel, skipUpload }, signal);
}

/**
 * @param {string} voteId
 * @param {{signal?: AbortSignal}}
 * @returns {Promise<void>}
 */
export function deleteImageVote(voteId, { signal } = {}) {
  return del(`${ImageVoteEndpoint}/${voteId}`, signal);
}
