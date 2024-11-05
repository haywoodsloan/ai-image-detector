import { isProd } from 'common/utilities/environment.js';
import { AllLabels } from 'common/utilities/huggingface.js';
import { l } from 'common/utilities/string.js';
import memoize, { memoizeClear } from 'memoize';
import { ObjectId } from 'mongodb';

import { getServiceDb } from './serviceDb.js';
import { UserCollName } from './userColl.js';
import { clearCachedVote } from '../../utilities/vote.js';

export const VoteCollName = 'votes';

const MinVoteCount = isProd ? 10 : 1;

const getVoteCollection = memoize(
  /** @returns {Promise<Collection<VoteDocument>>} */
  async () => {
    try {
      const db = await getServiceDb();
      return db.collection(VoteCollName);
    } catch (error) {
      console.error('Getting vote collection failed', error);
      memoizeClear(getVoteCollection);
      throw error;
    }
  },
  { cacheKey: () => getServiceDb() }
);

/**
 * @param {string} imageHash
 */
export async function queryVotedLabel(imageHash) {
  const votes = await getVoteCollection();

  /** @type {{_id: string, count: number}[]} */
  const [top, second] = await votes
    .aggregate([
      { $match: { imageHash } },
      {
        $lookup: {
          from: UserCollName,
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: false } },
      { $match: { voteLabel: { $in: AllLabels } } },
      { $group: { _id: '$voteLabel', count: { $sum: 1 } } },
      { $match: { count: { $gte: MinVoteCount } } },
      { $sort: { count: -1 } },
      { $limit: 2 },
    ])
    .toArray();

  if ((top?.count ?? 0) - (second?.count ?? 0) >= MinVoteCount) {
    return { voteLabel: top._id, count: top.count };
  }
}

/**
 * @param {string | ObjectId} voteId
 */
export async function queryVote(voteId) {
  const votes = await getVoteCollection();
  return await votes.findOne({ _id: new ObjectId(voteId) });
}

/**
 * @param {string | ObjectId} userId
 */
export async function queryVotesByUser(userId) {
  const votes = await getVoteCollection();
  return await votes.find({ userId: new ObjectId(userId) }).toArray();
}

/**
 * @param {string | ObjectId} userId
 * @param {string} imageHash
 */
export async function queryVoteByImage(userId, imageHash) {
  const votes = await getVoteCollection();
  return await votes.findOne({ userId: new ObjectId(userId), imageHash });
}

/**
 * @param {string | ObjectId} userId
 * @param {string} imageHash
 */
export async function deleteVoteByImage(userId, imageHash) {
  const votes = await getVoteCollection();
  const result = await votes.deleteOne({ userId: new ObjectId(userId), imageHash });
  if (result.deletedCount) clearCachedVote(imageHash);
}

/**
 * @param {string | ObjectId} voteId
 */
export async function deleteVote(voteId) {
  const votes = await getVoteCollection();
  const result =  await votes.findOneAndDelete({ _id: new ObjectId(voteId) });
  if (result?.imageHash) clearCachedVote(result.imageHash)
}

/**
 * @param {string} imageHash
 * @param {string | ObjectId} userId
 * @param {LabelType} voteLabel
 * @description Always updates the `changedAt` field to now
 */
export async function upsertVotedLabel(imageHash, userId, voteLabel) {
  if (!AllLabels.includes(voteLabel))
    throw new Error(l`voteLabel must be one of ${AllLabels}`);

  const votes = await getVoteCollection();
  const vote = await votes.findOneAndUpdate(
    { imageHash, userId: new ObjectId(userId) },
    { $set: { voteLabel, changedAt: new Date() } },
    { upsert: true, returnDocument: 'after' }
  );

  clearCachedVote(imageHash);
  return vote;
}
