import { readFile, readdir } from 'fs/promises';
import looksSame from 'looks-same';
import memoize from 'memoize';
import { join } from 'path';
import sharp from 'sharp';

import { isHttpUrl } from '../../../service/src/utilities/url.js';

// Maximum number of pixels Autotrain will handle
const MaxPixels = 178_956_970;

const getExcludedImages = memoize(async () => {
  const excludePath = new URL('../../exclude', import.meta.url);
  const excludeEntries = await readdir(excludePath, {
    withFileTypes: true,
    recursive: true,
  });

  return await Promise.all(
    excludeEntries
      .filter((entry) => entry.isFile())
      .map(async (entry) => ({
        name: entry.name,
        data: await readFile(join(entry.parentPath, entry.name)),
      }))
  );
});

/**
 * @param {string | URL} uri
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

/**
 * @param {string | URL | Buffer} img
 */
export async function sanitizeImage(img) {
  let imgData = img instanceof Buffer ? img : await getImageData(img);
  for (const exclude of await getExcludedImages()) {
    const { equal } = await looksSame(exclude.data, imgData, {
      stopOnFirstFail: true,
    });
    if (equal) throw new Error(`Matches an excluded image: ${exclude.name}`);
  }

  const { height, width } = await sharp(imgData).metadata();
  const pixelCount = height * width;

  if (pixelCount > MaxPixels) {
    const scale = Math.sqrt(MaxPixels / pixelCount);

    const scaledWidth = Math.floor(width * scale);
    const scaledHeight = Math.floor(height * scale);

    imgData = await sharp(imgData)
      .resize(scaledWidth, scaledHeight, { fit: 'inside' })
      .toBuffer();
  }

  return imgData;
}
