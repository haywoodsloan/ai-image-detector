import { analyzeImage } from '@/api/detector.js';
import { deleteImageVote, voteImageLabel } from '@/api/vote.js';
import { DataUrlAction } from '@/entrypoints/background/actions/dataUrl.js';

import { invokeBackgroundTask } from './background.js';
import { debugWarn } from './log.js';
import { getAnalysisStorage, useStorage, userSettings } from './storage.js';

/** @type {Set<Promise>} */
const fullUploadQueue = new Set();
const fullUploadLimit = 3;

/**
 * @param {string} url
 */
export function useImageAnalysis(url) {
  return useStorage(getAnalysisStorage(url));
}

/**
 * @param {string} src
 * @param {{force?: boolean, signal?: AbortSignal}}
 */
export async function checkImage(src, { force = false, signal } = {}) {
  try {
    return await analyzeImage(src, { signal });
  } catch (error) {
    signal.throwIfAborted();
    const { autoCheck, autoCheckPrivate } = await userSettings.getValue();
    const checkPrivate = force || (autoCheck && autoCheckPrivate);
    if (error?.status !== 404 || !checkPrivate) throw error;

    while (fullUploadQueue.size >= fullUploadLimit) {
      debugWarn('Full upload limit reached waiting for others to complete');
      await Promise.race([...fullUploadQueue]).catch();
    }

    const hardCheck = (async () => {
      const dataUrl = await invokeBackgroundTask(DataUrlAction, { src });
      signal.throwIfAborted();
      return await analyzeImage(dataUrl, { signal });
    })();

    fullUploadQueue.add(hardCheck);
    hardCheck.finally(() => fullUploadQueue.delete(hardCheck));

    return hardCheck;
  }
}

/**
 * @param {string} src
 * @param {LabelType} label
 * @param {{signal?: AbortSignal}}
 */
export async function reportImage(src, label, { signal } = {}) {
  const { uploadImages, uploadImagesPrivate } = await userSettings.getValue();
  try {
    return await voteImageLabel(src, label, {
      skipUpload: !uploadImages,
      signal,
    });
  } catch (error) {
    signal.throwIfAborted();
    if (error?.status !== 404) throw error;
    const skipUpload = !(uploadImagesPrivate && uploadImages);

    while (fullUploadQueue.size >= fullUploadLimit) {
      debugWarn('Full upload limit reached waiting for others to complete');
      await Promise.race([...fullUploadQueue]).catch();
    }

    const hardReport = (async () => {
      const dataUrl = await invokeBackgroundTask(DataUrlAction, { src });
      signal.throwIfAborted();
      return await voteImageLabel(dataUrl, label, { skipUpload, signal });
    })();

    fullUploadQueue.add(hardReport);
    hardReport.finally(() => fullUploadQueue.delete(hardReport));

    return hardReport;
  }
}

/**
 * @param {string} id
 * @param {{signal?: AbortSignal}}
 */
export async function deleteImageReport(id, { signal } = {}) {
  return await deleteImageVote(id, { signal });
}
