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
 * @param {string} src
 */
export async function analyzeImage(src, force = false) {
  try {
    return await checkImage(src);
  } catch (error) {
    const { autoCheck, autoCheckPrivate } = await userSettings.getValue();
    const checkPrivate = force || (autoCheck && autoCheckPrivate);
    if (error?.status !== 404 || !checkPrivate) throw error;
    return await checkImage(await imageToDataUrl(src));
  }
}

/**
 * @param {string} src
 * @param {LabelType} label
 */
export async function reportImage(src, label) {
  const { uploadImages, uploadImagesPrivate } = await userSettings.getValue();
  try {
    return await voteImageLabel(src, label, !uploadImages);
  } catch (error) {
    if (error?.status !== 404) throw error;
    const shouldUpload = !(uploadImagesPrivate && uploadImages);
    return await voteImageLabel(await imageToDataUrl(src), label, shouldUpload);
  }
}

/**
 * @param {string} src
 * @param {LabelType} label
 */
export async function deleteImageReport(src) {
  try {
    return await deleteImageVote(src);
  } catch (error) {
    if (error?.status !== 404) throw error;
    return await deleteImageVote(await imageToDataUrl(src));
  }
}

/**
 * @param {string} src
 */
async function imageToDataUrl(src) {
  const clone = new Image();
  clone.crossOrigin = 'anonymous';
  clone.src = src;

  await clone.decode();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.height = clone.height;
  canvas.width = clone.width;

  context.drawImage(clone, 0, 0);
  const dataUrl = canvas.toDataURL();

  return dataUrl;
}
