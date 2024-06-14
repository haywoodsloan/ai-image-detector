import { AllLabels } from 'common/utilities/huggingface.js';
import memoize from 'memoize';

import { l } from '../../utilities/string.js';
import { getServiceDb } from './serviceDb.js';
import { UserCollName, queryUserById, updateUser } from './userColl.js';

export const VoteCollName = 'votes';

const MinVoteCount = 5;

const getVoteCollection = memoize(async () => {
  const db = await getServiceDb();

  /** @type {VoteCollection} */
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
          foreignField: 'userId',
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
  const user = await queryUserById(userId);
  if (!user) throw new Error('Invalid userID');

  const votes = await getVoteCollection();
  const userVotes = await votes.find({ userId }).toArray();

  await updateUser(userId);
  return userVotes;
}

/**
 * @param {string} hash
 * @param {string} userId
 * @param {Partial<VoteDocument>} update
 * @description Always updates the `lastModify` field to now
 */
export async function upsertVotedLabel(hash, userId, update) {
  const user = await queryUserById(userId);
  if (!user) throw new Error('Invalid userID');

  if (update.voteLabel && !AllLabels.includes(update.voteLabel))
    throw new Error(l`voteLabel must be one of ${AllLabels}`);

  const votes = await getVoteCollection();
  const vote = await votes.findOneAndUpdate(
    { hash, userId },
    { $set: { ...update, lastModify: new Date() } },
    { upsert: true, returnDocument: 'after' }
  );

  await updateUser(userId);
  return vote;
}
