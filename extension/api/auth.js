import { get, post } from './base.js';

/** @typedef {Omit<UserAuth, 'email'>} ApiUserAuth*/

const AuthEndpoint = '/auth';

/**
 * @param {string} email
 * @returns {Promise<ApiUserAuth>}
 */
export async function createAuth(email) {
  return post(AuthEndpoint, { email });
}

/**
 * @throws {ApiError}
 * @returns {Promise<Omit<ApiUserAuth, 'accessToken'>}
 */
export async function getAuth() {
  return get(AuthEndpoint);
}
