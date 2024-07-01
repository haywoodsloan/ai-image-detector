import { queryValidAuth } from '../services/db/authColl.js';
import { updateUserActivity } from '../services/db/userColl.js';

export const AuthType = 'Bearer';
const AuthTypeRegEx = new RegExp(`^${AuthType} (?<accessToken>\\S*)`, 'i');

/**
 * @param {HttpRequest} request
 */
export async function assertValidAuth(request) {
  const accessToken = assertAccessToken(request);

  const auth = await queryValidAuth(accessToken);
  if (!auth) throw new Error('Invalid access token');

  await updateUserActivity(auth.userId);
  return auth.userId;
}

/**
 * @param {HttpRequest} request
 */
export function assertAccessToken(request) {
  const authHeader = request.headers.get('Authorization');
  const accessToken = AuthTypeRegEx.exec(authHeader)?.groups?.accessToken;

  if (!accessToken) throw new Error('No access token specified');
  return accessToken;
}
