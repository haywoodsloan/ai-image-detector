import { AllLabels } from 'common/utilities/huggingface.js';
import { l } from 'common/utilities/string.js';
import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';
import { UserCollName } from './userColl.js';

export const VoteCollName = 'votes';

const MinVoteCount = 5;

const getVoteCollection = memoize(async () => {
  const db = await getServiceDb();

  /** @type {Collection<VoteDocument>} */
  const votes = db.collection(VoteCollName);

  // Set a unique index for each hash + userId combo.
  await votes.createIndex({ hash: 1, userId: 1 }, { unique: true });

  return votes;
});

/**
 * @param {string} hash
 */
export async function queryVotedLabel(hash) {
  const votes = await getVoteCollection();

  /** @type {{_id: string, count: number}} */
  const result = await votes
    .aggregate([
      { $match: { hash } },
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
      { $limit: 1 },
    ])
    .tryNext();

  return result?._id ?? null;
}

/**
 * @param {string} userId
 */
export async function queryVotesByUser(userId) {
  const votes = await getVoteCollection();
  return await votes.find({ userId }).toArray();
}

/**
 * @param {string} imageHash
 * @param {string} userId
 * @param {LabelType} voteLabel
 * @description Always updates the `changedAt` field to now
 */
export async function upsertVotedLabel(imageHash, userId, voteLabel) {
  if (!AllLabels.includes(voteLabel))
    throw new Error(l`voteLabel must be one of ${AllLabels}`);

  const votes = await getVoteCollection();
  const vote = await votes.findOneAndUpdate(
    { imageHash, userId },
    { $set: { voteLabel, changedAt: new Date() } },
    { upsert: true, returnDocument: 'after' }
  );

  return vote;
}
