import { checkImage } from '@/api/detector.js';
import { deleteImageVote, voteImageLabel } from '@/api/vote.js';

import { getAnalysisStorage, useStorage, userSettings } from './storage.js';

/**
 * @param {string} url
 */
export function useImageAnalysis(url) {
  return useStorage(getAnalysisStorage(url));
}

/**
 * @param {HTMLImageElement} image
 */
export async function analyzeImage(image) {
  try {
    return checkImage(image.src);
  } catch (error) {
    const { autoCheck, autoCheckPrivate } = await userSettings.getValue();
    if (error?.status !== 404 || !(autoCheckPrivate && autoCheck)) throw error;
    return checkImage(imageToDataUrl(image));
  }
}

/**
 * @param {HTMLImageElement} image
 * @param {LabelType} label
 */
export async function reportImage(image, label) {
  const { uploadImages, uploadImagesPrivate } = await userSettings.getValue();
  try {
    return voteImageLabel(image.src, label, !uploadImages);
  } catch (error) {
    if (error?.status !== 404) throw error;
    const shouldUpload = !(uploadImagesPrivate && uploadImages);
    return voteImageLabel(imageToDataUrl(image), label, shouldUpload);
  }
}

/**
 * @param {HTMLImageElement} image
 * @param {LabelType} label
 */
export function deleteImageReport(image) {
  try {
    return deleteImageVote(image.src);
  } catch (error) {
    if (error?.status !== 404) throw error;
    return deleteImageVote(imageToDataUrl(image));
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
