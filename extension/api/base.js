import { userAuth } from '@/utilities/storage.js';

const BaseUrl = import.meta.env.VITE_API_BASE_URL;

/**
 * @param {string} url
 */
export async function get(endpoint, { withCreds = true } = {}) {
  const headers = await buildHeaders({ withCreds });
  const response = await fetch(new URL(endpoint, BaseUrl), { headers });

  if (!response.ok)
    throw new Error(`API GET request failed [${response.statusText}]`);

  return response.json();
}

/**
 * @param {string} url
 * @param {any} body
 */
export async function post(endpoint, body, { withCreds = true } = {}) {
  const headers = await buildHeaders({ withCreds });
  const response = await fetch(new URL(endpoint, BaseUrl), {
    headers,
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok)
    throw new Error(`API GET request failed [${response.statusText}]`);

  return response.json();
}

async function buildHeaders({ withCreds = true } = {}) {
  const headers = {};

  if (withCreds) {
    headers.Authorization = (await userAuth.getValue()).accessToken;
  }

  return headers;
}
