import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';
import { UserCollName, queryUser, updateUser } from './userColl.js';

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
export async function queryVotedClass(hash) {
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
      { $group: { _id: '$voteClass', count: { $sum: 1 } } },
      { $match: { count: { $gte: MinVoteCount } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ])
    .tryNext();

  return result?._id ?? null;
}

/**
 * @param {string} hash
 * @param {string} userId
 * @param {Partial<VoteDocument>} update
 * @description Always updates the `lastModify` field to now
 */
export async function upsertVotedClass(hash, userId, update) {
  const user = await queryUser(userId);
  if (!user) throw new Error('Invalid UserID');

  const votes = await getVoteCollection();
  await votes.updateOne(
    { hash, userId },
    { $set: { ...update, lastModify: new Date() } },
    { upsert: true }
  );

  await updateUser(userId);
}
