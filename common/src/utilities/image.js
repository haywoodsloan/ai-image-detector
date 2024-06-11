import { readFile } from 'fs/promises';

import { isHttpUrl } from '../../../service/src/utilities/url.js';

/**
 * @param {string} uri
 */
export async function getImageData(uri) {
  if (isHttpUrl(uri)) {
    const req = await fetch(uri);
    if (!req.ok) throw new Error(`GET request failed: ${req.statusText}`);

    const contentType = req.headers.get('Content-Type');
    const validHeader = contentType.startsWith('image/');
    if (!validHeader) throw new Error(`Invalid MIME type: ${contentType}`);

    return Buffer.from(await req.arrayBuffer());
  }

  const buffer = await readFile(uri);
  return buffer;
}
