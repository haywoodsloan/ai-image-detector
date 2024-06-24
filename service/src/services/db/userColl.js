import { validate as validateEmail } from 'email-validator';
import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';

export const UserCollName = 'users';

const getUserCollection = memoize(async () => {
  const db = await getServiceDb();

  /** @type {Collection<UserDocument>} */
  const users = db.collection(UserCollName);

  // Set a unique index for each userId.
  await users.createIndex({ email: 1 }, { unique: true });

  return users;
});

/**
 * @param {string} userId
 */
export async function queryUserById(userId) {
  const users = await getUserCollection();
  return users.findOne({ userId });
}

/**
 * @param {string} email
 */
export async function queryUserByEmail(email) {
  const users = await getUserCollection();
  return users.findOne({ email });
}

/**
 * @param {string} email
 */
export async function insertNewUser(email) {
  if (!validateEmail(email)) throw new Error('Invalid email address');

  /** @type {WithId<UserDocument>} */
  const newUser = { email, createdAt: new Date() };
  
  const users = await getUserCollection();
  await users.insertOne(newUser);

  return newUser;
}
