import { get, post } from './base.js';

/** @typedef {Omit<UserAuth, 'email'>} ApiUserAuth*/

const AuthEndpoint = '/auth';

/**
 * @param {string} email
 * @param {{signal?: AbortSignal}}
 * @returns {Promise<ApiUserAuth>}
 */
export async function createAuth(email, { signal } = {}) {
  return await post(AuthEndpoint, { email }, signal);
}

/**
 * @param {{signal?: AbortSignal}}
 * @throws {ApiError}
 * @returns {Promise<Omit<ApiUserAuth, 'accessToken'>}
 */
export async function getAuth({ signal } = {}) {
  return await get(AuthEndpoint, signal);
}
