import { openAsBlob } from 'fs';
import { isHttpUrl } from './url.js';

/**
 * @param {string} uri
 */
export async function getImageAsBlob(uri) {
  if (isHttpUrl(uri)) {
    const response = await fetch(uri, {
      headers: {
        Accept: 'image/*',
      },
    });

    return await response.blob();
  }

  const blob = await openAsBlob(uri);
  return blob;
}
