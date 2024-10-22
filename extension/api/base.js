import TimeSpan from 'common/utilities/TimeSpan.js';
import { NonRetryableError, withRetry } from 'common/utilities/retry.js';

import { ApiAction } from '@/entrypoints/background/actions/api.js';
import { invokeBackgroundTask } from '@/utilities/background.js';
import { debugWarn } from '@/utilities/log.js';
import { userAuth } from '@/utilities/storage.js';

const BaseUrl = import.meta.env.VITE_API_BASE_URL;
const DevKey = import.meta.env.VITE_API_DEV_KEY;

const ApiRetryLimit = 3;
const ApiErrorDelay = TimeSpan.fromMilliseconds(100);
const retry = withRetry(ApiRetryLimit, ApiErrorDelay);
const NonRetryStatuses = [401, 404];

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
 */
export function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

/**
 * @param {string} endpoint
 * @param {RequestInit} init
 * @throws {ApiError}
 */
export function request(endpoint, init = {}) {
  // Use the background script if not already in it
  if (import.meta.env.ENTRYPOINT === 'content')
    return invokeBackgroundTask(ApiAction, { endpoint, init });

  return retry(
    async () => {
      const headers = await buildHeaders();
      const response = await fetch(new URL(endpoint, BaseUrl), {
        ...init,
        headers: { ...init.headers, ...headers },
      });

      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');

        let errorText;
        if (contentType === 'application/json') {
          const { error } = await response.json();
          errorText = `(Status=${response.status}, Message=${error})`;
        } else {
          const error = await response.text();
          errorText = error
            ? `(Status=${response.status}, Message=${error})`
            : `(Status=${response.status})`;
        }

        const error = new ApiError(
          response.status,
          `API ${init.method ?? 'GET'} request failed ${errorText}`
        );

        if (NonRetryStatuses.includes(response.status)) {
          if (response.status === 401) {
            debugWarn(`Got 401 from API, resetting credentials`);
            await userAuth.removeValue();
          }
          throw new NonRetryableError(error);
        }

        throw error;
      }

      if (response.status === 204) return;
      return response.json();
    },
    (error) => debugWarn(`Retrying request to ${endpoint}`, error)
  );
}

async function buildHeaders() {
  const headers = {};

  if (DevKey) headers['X-Dev-Key'] = DevKey;

  const accessToken = (await userAuth.getValue())?.accessToken;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return headers;
}
