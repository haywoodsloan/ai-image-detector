import { fileTypeFromBuffer } from 'file-type';
import { readFile, readdir } from 'fs/promises';
import looksSame from 'looks-same';
import memoize from 'memoize';
import { join } from 'path';
import sharp from 'sharp';

import { bl, yl } from './colors.js';
import { l } from './string.js';
import { isDataUrl, isHttpUrl } from './url.js';

// Maximum number of pixels Autotrain will handle
const MaxPixels = 178_956_970;
const OptimizedWidth = 256;
const OptimizedHeight = 256;

const getExcludedImages = memoize(async () => {
  // Read each excluded file return the name and data
  const excludePath = new URL('../../exclude', import.meta.url);
  console.log(yl`Getting excluded images ${{ path: excludePath }}`);

  const excludeEntries = await readdir(excludePath, {
    withFileTypes: true,
    recursive: true,
  });

  return await Promise.all(
    excludeEntries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        console.log(bl`Exclude entry ${entry}`);

        // Azure Functions don't have the latest Node v20
        // So we need to also check for the old path prop
        const parent = entry.parentPath ?? entry.path;
        return {
          name: entry.name,
          data: await readFile(join(parent, entry.name)),
        };
      })
  );
});

/**
 * @param {string | URL} uri
 * @param {{auth?: string, referer?: string}}
 */
export async function getImageData(uri, { auth, referer } = {}) {
  // If a url was provided, fetch it
  if (isHttpUrl(uri) || isDataUrl(uri)) {
    /** @type {HeadersInit} */
    const headers = {};
    if (auth) headers['Authorization'] = auth;
    if (referer) headers['Referer'] = referer;

    const req = await fetch(uri, { headers });
    if (!req.ok)
      throw new Error(`Image fetch failed, ${req.statusText || req.status}`);

    // Make sure the content type is correct
    const contentType = req.headers.get('Content-Type');
    const validMIME = contentType.startsWith('image/');

    if (!validMIME) throw new Error(`Invalid image MIME type "${contentType}"`);

    return Buffer.from(await req.arrayBuffer());
  }

  // Otherwise assume its a local path
  const buffer = await readFile(uri);
  return buffer;
}

/**
 * @param {Buffer} imgData
 */
export async function normalizeImage(imgData) {
  return await sharp(imgData).ensureAlpha().raw().toBuffer();
}

/**
 * @param {Buffer} data
 */
export async function optimizeImage(data) {
  console.log(l`Optimizing image, pre-size: ${data.byteLength}`);
  data = await sharp(data)
    .resize(OptimizedWidth, OptimizedHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      smartSubsample: true,
      smartDeblock: true,
      quality: 90,
    })
    .toBuffer();

  console.log(l`Optimization complete, post-size: ${data.byteLength}`);
  return data;
}

/**
 * @param {string | URL | Buffer} img
 * @param {string} [auth]
 */
export async function sanitizeImage(img, { auth, referer } = {}) {
  // Check if the image matches one of the excluded
  const imgData =
    img instanceof Buffer ? img : await getImageData(img, { auth, referer });

  for (const exclude of await getExcludedImages()) {
    const { equal } = await looksSame(exclude.data, imgData, {
      stopOnFirstFail: true,
    });
    if (equal) throw new Error(`Matches excluded image ${exclude.name}`);
  }

  // Make sure the image isn't too big
  const imgSharp = sharp(imgData);

  const { height, width } = await imgSharp.metadata();
  const pixelCount = height * width;

  // If too big scale it to the max allowed size
  if (pixelCount > MaxPixels) {
    const scale = Math.sqrt(MaxPixels / pixelCount);

    const scaledWidth = Math.floor(width * scale);
    const scaledHeight = Math.floor(height * scale);

    imgSharp.resize(scaledWidth, scaledHeight, { fit: 'inside' });
  }

  return await imgSharp.toBuffer();
}

/**
 * @param {Buffer} imgData
 */
export async function getExt(imgData) {
  const type = await fileTypeFromBuffer(imgData);
  if (!type?.ext) {
    throw new Error('Could not determine extension from image data');
  } else return type.ext;
}

export async function getMime(imgData) {
  const type = await fileTypeFromBuffer(imgData);
  if (!type?.mime) {
    throw new Error('Could not determine MIME from image data');
  } else return type.mime;
}
