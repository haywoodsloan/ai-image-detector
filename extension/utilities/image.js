import { checkImage } from '@/api/detector.js';
import { deleteImageVote, voteImageLabel } from '@/api/vote.js';
import { DataUrlAction } from '@/entrypoints/background/actions/dataUrl.js';

import { invokeBackgroundTask } from './background.js';
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
    const dataUrl = await invokeBackgroundTask(DataUrlAction, { src });
    return await checkImage(dataUrl);
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
    const skipUpload = !(uploadImagesPrivate && uploadImages);
    const dataUrl = await invokeBackgroundTask(DataUrlAction, { src });
    return await voteImageLabel(dataUrl, label, skipUpload);
  }
}

/**
 * @param {string} src
 * @param {LabelType} label
 */
export async function deleteImageReport(src) {
  const { uploadImages, uploadImagesPrivate } = await userSettings.getValue();
  try {
    return await deleteImageVote(src, !uploadImages);
  } catch (error) {
    if (error?.status !== 404) throw error;
    const skipUpload = !(uploadImagesPrivate && uploadImages);
    const dataUrl = await invokeBackgroundTask(DataUrlAction, { src });
    return await deleteImageVote(dataUrl, skipUpload);
  }
}
