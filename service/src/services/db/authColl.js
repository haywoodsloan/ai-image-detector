import TimeSpan from 'common/utilities/TimeSpan.js';
import { cryptoString } from 'common/utilities/string.js';
import memoize from 'memoize';
import { ObjectId } from 'mongodb';

import { getValidationSocketUrl } from '../pubsub.js';
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
 * @param {string | ObjectId} userId
 */
export async function insertNewAuth(userId, verified = false) {
  /** @type {WithId<AuthDocument>} */
  const newAuth = {
    userId: new ObjectId(userId),
    accessToken: cryptoString(256),

    verifyStatus: verified ? VerificationComplete : PendingVerification,
    verifyCode: cryptoString(256),
    ...(!verified && {
      verifySocket: await getValidationSocketUrl(userId, PendingAuthTimeout),
    }),

    refreshedAt: new Date(),
    ttl: verified
      ? ValidAuthTimeout.getSeconds()
      : PendingAuthTimeout.getSeconds(),
  };

  const auths = await getAuthCollection();
  await auths.insertOne(newAuth);

  // Remove all other pending verifications for the user
  await auths.deleteMany({
    userId: new Object(userId),
    _id: { $ne: newAuth._id },
    verifyStatus: PendingVerification,
  });

  return newAuth;
}

/**
 * @param {string} accessToken
 */
export async function queryAuth(accessToken) {
  const auths = await getAuthCollection();
  return await auths.findOne({ accessToken });
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
    { $set: { refreshedAt: new Date() } }
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
      $unset: { verifySocket: 1 },
    },
    { returnDocument: 'after' }
  );
}
