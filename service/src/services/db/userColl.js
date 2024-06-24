import { randomBytes } from 'crypto';
import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';

export const UserCollName = 'users';

const getUserCollection = memoize(async () => {
  const db = await getServiceDb();

  /** @type {UserCollection} */
  const users = db.collection(UserCollName);

  // Set a unique index for each userId.
  await users.createIndex({ userId: 1 }, { unique: true });
  await users.createIndex({ createdAt: 1 });

  return users;
});

/**
 * @param {string} userId
 */
export async function queryUser(userId) {
  const users = await getUserCollection();
  return users.findOneAndUpdate(
    { userId },
    { $set: { lastAccess: new Date() } }
  );
}

/**
 * @param {string} userId
 */
export async function queryLastCreate(createdBy) {
  const users = await getUserCollection();

  /** @type {UserDocument} */
  const lastUser = await users
    .aggregate([
      { $match: { createdBy } },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
    ])
    .tryNext();

  return lastUser?.createdAt;
}

/**
 * @param {string} userId
 * @param {Partial<UserDocument>} update
 * @description Always updates the `lastAccess` field to now
 */
export async function updateUser(userId, update = null) {
  const users = await getUserCollection();
  await users.updateOne(
    { userId },
    { $set: { ...update, lastAccess: new Date() } }
  );
}

/**
 * @param {string} createdBy
 * @param {string} userId
 */
export async function insertNewUser(
  createdBy,
  userId = randomBytes(128).toString('base64')
) {
  if (!createdBy) throw new Error('Invalid createdBy address');

  const users = await getUserCollection();
  const now = new Date();

  /** @type {UserDocument} */
  const newUser = { userId, createdBy, createdAt: now, lastAccess: now };
  await users.insertOne(newUser);

  return newUser;
}
