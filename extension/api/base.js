import { ApiAction } from '@/entrypoints/background/actions/api.js';
import { invokeBackgroundTask } from '@/utilities/background.js';
import { userAuth } from '@/utilities/storage.js';

const BaseUrl = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  /** @type {number} */ status;

  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {string} endpoint
 */
export function get(endpoint) {
  return request(endpoint);
}

/**
 * @param {string} endpoint
 * @param {any} body
 */
export function post(endpoint, body) {
  return request(endpoint, { method: 'POST', body: JSON.stringify(body) });
}

/**
 * @param {string} endpoint
 * @param {RequestInit} init
 */
export async function request(endpoint, init = {}) {
  // Use the background script if not already in it
  if (import.meta.env.ENTRYPOINT !== 'background')
    return invokeBackgroundTask(ApiAction, { endpoint, init });

  const headers = await buildHeaders();
  const response = await fetch(new URL(endpoint, BaseUrl), {
    ...init,
    headers: { ...init.headers, ...headers },
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API ${init.method ?? 'GET'} request failed [${response.statusText}]`
    );
  }

  if (response.status === 204) return;
  return response.json();
}

async function buildHeaders() {
  const headers = {};

  const accessToken = (await userAuth.getValue())?.accessToken;
  if (accessToken) headers.Authorization = accessToken;

  return headers;
}
