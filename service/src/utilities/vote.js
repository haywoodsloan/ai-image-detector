import TimeSpan from 'common/utilities/TimeSpan.js';
import ExpiryMap from 'expiry-map';

import { queryVotedLabel } from '../services/db/voteColl.js';

/** @type {ExpiryMap<string, {voteLabel: string, count: number}>} */
const VoteCache = new ExpiryMap(TimeSpan.fromMinutes(15).valueOf());

/**
 * @param {string} imageHash
 */
export async function getVotedLabel(imageHash) {
  if (VoteCache.has(imageHash)) return VoteCache.get(imageHash);

  const votedLabel = await queryVotedLabel(imageHash);
  VoteCache.set(votedLabel);

  return votedLabel;
}

export function clearCachedVote(imageHash) {
  VoteCache.delete(imageHash);
}