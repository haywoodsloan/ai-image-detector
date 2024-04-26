import { openAsBlob } from 'fs';
import { isHttpUrl } from './url.js';

/**
 * @param {string} url
 */
export async function getImageAsBlob(url) {
  if (isHttpUrl(url)) {
    const response = await fetch(url, {
      headers: {
        Accept: 'image/*',
      },
    });

    return await response.blob();
  }

  const blob = await openAsBlob(url);
  return blob;
}
