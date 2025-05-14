import { del, post } from './base.js';

const ImageVoteEndpoint = '/imageVote';

/**
 * @param {string} url
 * @param {LabelType} voteLabel
 * @param {{skipUpload?: boolean, signal?: AbortSignal, referer?: string}}
 * @returns {Promise<ImageVote>}
 */
export async function voteImageLabel(
  url,
  voteLabel,
  { skipUpload = false, signal, referer } = {}
) {
  return await post(
    ImageVoteEndpoint,
    { url, voteLabel, skipUpload, ...(referer && { referer }) },
    signal
  );
}

/**
 * @param {string} voteId
 * @param {{signal?: AbortSignal}}
 * @returns {Promise<void>}
 */
export async function deleteImageVote(voteId, { signal } = {}) {
  return await del(`${ImageVoteEndpoint}/${voteId}`, signal);
}
