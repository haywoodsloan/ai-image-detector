import { checkImage } from '@/api/detector.js';

/**
 * @param {HTMLImageElement} image
 */
export function analyzeImage(image) {
  try {
    return checkImage(image.src);
  } catch (error) {
    if (error?.status !== 404) throw error;
    return checkImage(imageToDataUrl(image));
  }
}

/**
 * @param {HTMLImageElement} image
 */
async function imageToDataUrl(image) {
  const clone = new Image();
  clone.crossOrigin = 'anonymous';

  clone.srcset = image.srcset;
  clone.src = image.src;

  await clone.decode();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.height = clone.height;
  canvas.width = clone.width;

  context.drawImage(clone, 0, 0);
  const dataUrl = canvas.toDataURL();

  return dataUrl;
}
