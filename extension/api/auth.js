import { get, post } from './base.js';

/** @typedef {Omit<UserAuth, 'email'>} ApiUserAuth*/

const CreateAuthEndpoint = '/createAuth';
const CheckAuthEndpoint = '/createAuth';

/**
 * @param {string} email
 * @returns {Promise<ApiUserAuth>}
 */
export async function createAuth(email) {
  return post(CreateAuthEndpoint, { email });
}

/**
 * @throws {ApiError}
 * @returns {Promise<Omit<ApiUserAuth, 'accessToken'>}
 */
export async function checkAuth() {
  return get(CheckAuthEndpoint);
}
