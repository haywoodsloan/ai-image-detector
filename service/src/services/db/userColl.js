import { randomUUID } from 'crypto';
import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';

export const UserCollName = 'users';

const getUserCollection = memoize(async () => {
  const db = await getServiceDb();

  /** @type {UserCollection} */
  const users = db.collection(UserCollName);

  // Set a unique index for each hash + userId combo.
  await users.createIndex({ userId: 1 }, { unique: true });
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
 * @param {string} userId
 */
export async function insertNewUser(userId = randomUUID()) {
  const users = await getUserCollection();
  const now = new Date();

  /** @type {UserDocument} */
  const newUser = { userId, createdAt: now, lastAccess: now };

  await users.insertOne(newUser);
  return newUser;
}
