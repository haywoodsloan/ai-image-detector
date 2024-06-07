import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';

const CollName = 'votes';
const MinVoteCount = 5;

const getVoteCollection = memoize(async () => {
  const db = await getServiceDb();

  /** @type {VoteCollection} */
  const votes = db.collection(CollName);

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
 * @param {string} voteClass
 */
export async function upsertVotedClass(hash, userId, voteClass) {
  // TODO check if the user ID is registered.
  const votes = await getVoteCollection();
  await votes.updateOne(
    { hash, userId },
    { $set: { hash, userId, voteClass, lastModify: new Date() } },
    { upsert: true }
  );
}
