import { queryValidAuth } from '../services/db/authColl.js';

export const AuthType = 'Bearer';
const AuthTypeRegEx = new RegExp(`^${AuthType} (?<accessToken>\\S*)`, 'i');

/**
 * @param {HttpRequest} request
 */
export async function assertValidAuth(request) {
  const authHeader = request.headers.get('Authorization');
  const { accessToken } = authHeader.match(AuthTypeRegEx).groups;

  const auth = await queryValidAuth(accessToken);
  if (!auth) throw new Error('Must specify a valid access token');

  return auth.userId;
}
