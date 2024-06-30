import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';

export const UserCollName = 'users';

const getUserCollection = memoize(
  /** @returns {Promise<Collection<UserDocument>>} */
  async () => (await getServiceDb()).collection(UserCollName),
  { cacheKey: () => getServiceDb() }
);

/**
 * @param {string} emailHash
 */
export async function queryUserByEmail(emailHash) {
  const users = await getUserCollection();
  return users.findOne({ emailHash });
}

/**
 * @param {string} userId
 */
export async function updateUserActivity(userId) {
  const users = await getUserCollection();

  const result = await users.updateOne(
    { _id: userId },
    { $set: { lastAccessAt: new Date() } }
  );

  if (!result.matchedCount) throw new Error('Invalid UserID');
}

/**
 * @param {string} emailHash
 */
export async function insertNewUser(emailHash) {
  const now = new Date();

  /** @type {WithId<UserDocument>} */
  const newUser = { emailHash, createdAt: now, lastAccessAt: now };

  const users = await getUserCollection();
  await users.insertOne(newUser);

  return newUser;
}
