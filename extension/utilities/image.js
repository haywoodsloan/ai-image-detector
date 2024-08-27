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
function imageToDataUrl(image) {
  const canvas = document.createElement('canvas');
  canvas.height = image.naturalWidth;
  canvas.width = image.naturalHeight;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  return canvas.toDataURL();
}
