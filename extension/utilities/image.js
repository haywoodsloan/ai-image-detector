import { isBlobUrl, isHttpUrl } from 'common/utilities/url.js';

import { analyzeImage } from '@/api/detector.js';
import { deleteImageVote, voteImageLabel } from '@/api/vote.js';
import { DataUrlAction } from '@/entrypoints/background/actions/dataUrl.js';

import { invokeBackgroundTask } from './background.js';
import { debugWarn } from './log.js';
import { getAnalysisStorage, useStorage, userSettings } from './storage.js';

/** @type {Set<Promise>} */
const fullUploadQueue = new Set();
const fullUploadLimit = 5;

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
    if (isHttpUrl(src)) {
      return await analyzeImage(src, {
        referer: document.location.origin,
        signal,
      });
    }

    await waitForUploadSlot();
    signal?.throwIfAborted();

    if (isBlobUrl(src)) {
      src = await convertBlobUrl(src);
      signal?.throwIfAborted();
    }

    const hardCheck = (async () => {
      try {
        return await analyzeImage(src, { signal });
      } finally {
        fullUploadQueue.delete(hardCheck);
      }
    })();

    fullUploadQueue.add(hardCheck);
    return await hardCheck;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    signal?.throwIfAborted();

    const { autoCheck, autoCheckPrivate } = await userSettings.getValue();
    const checkPrivate = force || (autoCheck && autoCheckPrivate);
    if (error?.status !== 404 || !checkPrivate) throw error;

    await waitForUploadSlot();
    signal?.throwIfAborted();

    const hardCheck = (async () => {
      try {
        const dataUrl = await invokeBackgroundTask(DataUrlAction, { src });
        signal?.throwIfAborted();
        return await analyzeImage(dataUrl, { signal });
      } finally {
        fullUploadQueue.delete(hardCheck);
      }
    })();

    fullUploadQueue.add(hardCheck);
    return await hardCheck;
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
    if (isHttpUrl(src)) {
      return await voteImageLabel(src, label, {
        referer: document.location.origin,
        skipUpload: !uploadImages,
        signal,
      });
    }

    await waitForUploadSlot();
    signal?.throwIfAborted();

    const hardCheck = (async () => {
      try {
        return await voteImageLabel(src, label, {
          skipUpload: !uploadImages,
          signal,
        });
      } finally {
        fullUploadQueue.delete(hardCheck);
      }
    })();

    fullUploadQueue.add(hardCheck);
    return await hardCheck;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    signal?.throwIfAborted();

    if (error?.status !== 404) throw error;
    const skipUpload = !(uploadImagesPrivate && uploadImages);

    await waitForUploadSlot();
    signal?.throwIfAborted();

    const hardReport = (async () => {
      try {
        const dataUrl = await invokeBackgroundTask(DataUrlAction, { src });
        signal?.throwIfAborted();
        return await voteImageLabel(dataUrl, label, { skipUpload, signal });
      } finally {
        fullUploadQueue.delete(hardReport);
      }
    })();

    fullUploadQueue.add(hardReport);
    return await hardReport;
  }
}

/**
 * @param {string} id
 * @param {{signal?: AbortSignal}}
 */
export async function deleteImageReport(id, { signal } = {}) {
  return await deleteImageVote(id, { signal });
}

async function waitForUploadSlot() {
  while (fullUploadQueue.size >= fullUploadLimit) {
    debugWarn('Full upload limit reached waiting for others to complete');
    await Promise.race([...fullUploadQueue]).catch();
  }
}

/**
 * @param {HTMLImageElement} img
 */
export function getImageSrc(img) {
  return img.currentSrc || img.src;
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function convertBlobUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((res) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.readAsDataURL(blob);
  });
}
