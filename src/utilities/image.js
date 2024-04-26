import { openAsBlob } from 'fs';

/**
 * @param {string} url
 */
export async function getImageAsBlob(url) {
  const { protocol } = new URL(url);
  if (['http:', 'https:'].includes(protocol)) {
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
