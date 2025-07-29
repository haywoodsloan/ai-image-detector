import TimeSpan from 'common/utilities/TimeSpan.js';
import { ApiError } from 'common/utilities/error.js';
import { NonRetryableError, withRetry } from 'common/utilities/retry.js';

import {
  AbortApiAction,
  ApiAction,
} from '@/entrypoints/background/actions/api.js';
import { invokeBackgroundTask } from '@/utilities/background.js';
import { debugWarn } from '@/utilities/log.js';
import { userAuth } from '@/utilities/storage.js';

const BaseUrl = import.meta.env.VITE_API_BASE_URL;
const DevKey = import.meta.env.VITE_API_DEV_KEY;

const ApiRetryLimit = 3;
const ApiErrorDelay = TimeSpan.fromMilliseconds(100);
const retry = withRetry(ApiRetryLimit, ApiErrorDelay);
const NonRetryStatuses = [401, 404];

/**
 * @param {string} endpoint
 * @param {AbortSignal} [signal]
 */
export async function get(endpoint, signal) {
  return await request(endpoint, { signal });
}

/**
 * @param {string} endpoint
 * @param {any} body
 * @param {AbortSignal} [signal]
 */
export async function post(endpoint, body, signal) {
  return await request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * @param {string} endpoint
 * @param {AbortSignal} [signal]
 */
export async function del(endpoint, signal) {
  return await request(endpoint, { method: 'DELETE', signal });
}

/**
 * @param {string} endpoint
 * @param {RequestInit} init
 * @throws {ApiError}
 */
export async function request(endpoint, init = {}) {
  // Use the background script if not already in it
  if (import.meta.env.ENTRYPOINT === 'content') {
    if (!init.signal)
      return await invokeBackgroundTask(ApiAction, { endpoint, init });

    const id = crypto.randomUUID();
    init.signal.addEventListener(
      'abort',
      async () => await invokeBackgroundTask(AbortApiAction, { id })
    );

    delete init.signal;
    return await invokeBackgroundTask(ApiAction, { endpoint, init, id });
  }

  return await retry(
    async () => {
      if (init.signal?.aborted) {
        throw new NonRetryableError('Request aborted');
      }
      
      const headers = await buildHeaders();
      let response;

      try {
        response = await fetch(new URL(endpoint, BaseUrl), {
          ...init,
          headers: { ...init.headers, ...headers },
        });
      } catch (error) {
        if (error?.name === 'AbortError') throw new NonRetryableError(error);
        throw error;
      }

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
      return await response.json();
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
