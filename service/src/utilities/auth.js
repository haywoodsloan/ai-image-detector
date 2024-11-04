import TimeSpan from 'common/utilities/TimeSpan.js';
import ExpiryMap from 'expiry-map';

import { queryValidAuth } from '../services/db/authColl.js';
import { updateUserActivity } from '../services/db/userColl.js';

export class InvalidAuthError extends Error {}
export const AuthType = 'Bearer';

/** @type {ExpiryMap<string, AuthDocument>} */
const AuthCache = new ExpiryMap(TimeSpan.fromMinutes(5).valueOf());
const AuthTypeRegEx = new RegExp(`^${AuthType} (?<accessToken>\\S*)`, 'i');

/**
 * @param {HttpRequest} request
 */
export async function assertValidAuth(request) {
  const accessToken = assertAccessToken(request);
  if (AuthCache.has(accessToken)) {
    const cached = AuthCache.get(accessToken);
    if (cached) {
      await updateUserActivity(cached.userId);
      return cached.userId;
    }
    throw new InvalidAuthError('Invalid access token');
  }

  const auth = await queryValidAuth(accessToken);
  if (!auth) {
    AuthCache.set(accessToken, null);
    throw new InvalidAuthError('Invalid access token');
  }

  AuthCache.set(accessToken, auth);
  await updateUserActivity(auth.userId);
  return auth.userId;
}

/**
 * @param {HttpRequest} request
 */
export function assertAccessToken(request) {
  const authHeader = request.headers.get('Authorization');
  const accessToken = AuthTypeRegEx.exec(authHeader)?.groups?.accessToken;

  if (!accessToken) throw new InvalidAuthError('No access token specified');
  return accessToken;
}

/**
 * @param {string} accessToken
 */
export function clearCachedAuth(accessToken) {
  if (accessToken) AuthCache.delete(accessToken);
}
