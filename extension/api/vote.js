import { del, post } from './base.js';

const ImageVoteEndpoint = '/imageVote';

/**
 * @param {string} url
 * @param {LabelType} voteLabel
 * @param {{skipUpload?: boolean, signal?: AbortSignal}}
 * @returns {Promise<ImageVote>}
 */
export async function voteImageLabel(
  url,
  voteLabel,
  { skipUpload = false, signal } = {}
) {
  return await post(ImageVoteEndpoint, { url, voteLabel, skipUpload }, signal);
}

/**
 * @param {string} voteId
 * @param {{signal?: AbortSignal}}
 * @returns {Promise<void>}
 */
export async function deleteImageVote(voteId, { signal } = {}) {
  return await del(`${ImageVoteEndpoint}/${voteId}`, signal);
}
