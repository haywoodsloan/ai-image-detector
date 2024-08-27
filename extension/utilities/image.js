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
  return new Promise((res) => {
    const clone = new Image();
    clone.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.height = clone.naturalWidth;
      canvas.width = clone.naturalHeight;

      const context = canvas.getContext('2d');
      context.drawImage(clone, 0, 0);
      const dataUrl = canvas.toDataURL();

      console.log('data url for image', dataUrl);
      res(dataUrl);
    };

    clone.crossOrigin = 'anonymous';
    clone.src = image.src;
  });
}
