import TimeSpan from 'common/utilities/TimeSpan.js';
import { isLocal } from 'common/utilities/environment.js';
import { randomBytes } from 'crypto';
import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';

export const AuthCollName = 'auths';
export const PendingVerification = 'pending';
export const VerificationComplete = 'verified';

const getAuthCollection = memoize(async () => {
  const db = await getServiceDb();

  /** @type {Collection<AuthDocument>} */
  const auths = db.collection(AuthCollName);

  // Set a unique index for each access token and verification code.
  await auths.createIndex({ accessToken: 1 }, { unique: true });
  await auths.createIndex({ 'verification.code': 1 }, { unique: true });
  await auths.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  return auths;
});

/**
 * @param {string} userId
 */
export async function insertNewAuth(userId) {
  /** @type {WithId<AuthDocument>} */
  const newAuth = {
    userId,
    expiresAt: new Date(Date.now() + TimeSpan.fromMinutes(15)),
    accessToken: randomBytes(128).toString('base64'),

    verification: {
      code: randomBytes(128).toString('base64url'),
      status: isLocal ? VerificationComplete : PendingVerification,
    },
  };

  const auths = await getAuthCollection();
  await auths.insertOne(newAuth);

  return newAuth;
}

/**
 * @param {string} accessToken
 */
export async function queryValidAuth(accessToken) {
  const auths = await getAuthCollection();
  return await auths.findOneAndUpdate(
    {
      accessToken,
      'verification.status': VerificationComplete,
    },
    { $set: { expiresAt: new Date(Date.now() + TimeSpan.fromDays(30)) } },
    { returnDocument: 'after' }
  );
}

/**
 * @param {string} code
 */
export async function verifyAuth(code) {
  const auths = await getAuthCollection();
  return await auths.findOneAndUpdate(
    {
      'verification.code': code,
      'verification.status': PendingVerification,
    },
    {
      $set: {
        expiresAt: new Date(Date.now() + TimeSpan.fromDays(30)),
        'verification.status': VerificationComplete,
      },
    },
    { returnDocument: 'after' }
  );
}
