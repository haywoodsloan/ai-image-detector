import TimeSpan from 'common/utilities/TimeSpan.js';
import { randomBytes } from 'crypto';
import memoize from 'memoize';

import { getServiceDb } from './serviceDb.js';

export const AuthCollName = 'auths';
export const PendingVerification = 'pending';
export const VerificationComplete = 'verified';

export const PendingAuthTimeout = TimeSpan.fromMinutes(15);
export const ValidAuthTimeout = TimeSpan.fromDays(30);

const getAuthCollection = memoize(
  /** @returns {Promise<Collection<AuthDocument>>} */
  async () => (await getServiceDb()).collection(AuthCollName),
  { cacheKey: () => getServiceDb() }
);

/**
 * @param {ObjectId} userId
 */
export async function insertNewAuth(userId, verified = false) {
  /** @type {WithId<AuthDocument>} */
  const newAuth = {
    userId,
    accessToken: randomBytes(256).toString('base64'),

    verifyCode: randomBytes(256).toString('base64url'),
    verifyStatus: verified ? VerificationComplete : PendingVerification,

    refreshedAt: new Date(),
    ttl: PendingAuthTimeout.getSeconds(),
  };

  const auths = await getAuthCollection();
  await auths.insertOne(newAuth);

  // Remove all other pending verifications for the user
  await auths.deleteMany({
    userId,
    _id: { $ne: newAuth._id },
    verifyStatus: PendingVerification,
  });

  return newAuth;
}

export async function queryAuth(accessToken) {
  const auths = await getAuthCollection();
  return auths.findOne({ accessToken });
}

/**
 * @param {string} accessToken
 */
export async function queryValidAuth(accessToken) {
  const auths = await getAuthCollection();
  return await auths.findOneAndUpdate(
    {
      accessToken,
      verifyStatus: VerificationComplete,
    },
    { $set: { refreshedAt: new Date() } },
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
      verifyCode: code,
      verifyStatus: PendingVerification,
    },
    {
      $set: {
        refreshedAt: new Date(),
        ttl: ValidAuthTimeout.getSeconds(),
        verifyStatus: VerificationComplete,
      },
    },
    { returnDocument: 'after' }
  );
}
