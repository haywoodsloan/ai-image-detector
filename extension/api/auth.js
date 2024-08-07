import { get, post } from './base.js';

const CreateAuthEndpoint = '/createAuth';
const CheckAuthEndpoint = '/createAuth';

/**
 * @returns {Promise<UserAuth>}
 */
export async function createAuth(email) {
  return post(CreateAuthEndpoint, { email });
}

/**
 * @throws {ApiError}
 * @returns {Promise<Omit<UserAuth, 'accessToken'>}
 */
export async function checkAuth() {
  return get(CheckAuthEndpoint);
}
