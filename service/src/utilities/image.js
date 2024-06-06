import { readFile } from 'fs/promises';

import { isHttpUrl } from './url.js';

/**
 * @param {string} uri
 */
export async function getImageData(uri) {
  if (isHttpUrl(uri)) {
    const response = await fetch(uri, {
      headers: {
        Accept: 'image/*',
      },
    });

    return Buffer.from(await response.arrayBuffer());
  }

  const buffer = await readFile(uri);
  return buffer;
}
