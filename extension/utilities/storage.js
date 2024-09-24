import cloneDeep from 'clone-deep';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { sha1 } from 'hash-wasm';

import { TtlAction } from '@/entrypoints/background/actions/ttl.js';

import { invokeBackgroundTask } from './background.js';

const AnalysisTtl = TimeSpan.fromMinutes(10).valueOf();

/** @type {WxtStorageItem<UserSettings>} */
export const userSettings = storage.defineItem('sync:userSettings', {
  defaultValue: {
    autoCheck: true,
    autoCheckPrivate: false,

    uploadImages: true,
    uploadImagesPrivate: false,

    disabledSites: [],
    indicatorPosition: 'top-left'
  },
});

/** @type {WxtStorageItem<UserAuth>} */
export const userAuth = storage.defineItem('sync:userAuth');

/**
 * @param {string} url
 */
export async function getAnalysisStorage(url) {
  const hash = await sha1(url);
  const storageKey = `local:analysis-${hash}`;

  /** @type {WxtStorageItem<ImageAnalysis>} */
  const item = storage.defineItem(storageKey);

  const oldSet = item.setValue.bind(item);
  item.setValue = (...args) => {
    invokeBackgroundTask(TtlAction, { storageKey, ttl: AnalysisTtl });
    return oldSet(...args);
  };

  return item;
}

/**
 * @template T
 * @param {WxtStorageItem<T> | Promise<WxtStorageItem<T>>} storage
 * */
export function useStorage(storage) {
  /** @type {T} */
  let stored = null;
  let initialized = false;

  return customRef((track, trigger) => ({
    get() {
      track();

      if (!initialized) {
        initialized = true;
        (async () => {
          const item = await storage;
          stored = (await item.getValue()) ?? undefined;
          trigger();

          item.watch((newVal) => {
            stored = newVal ?? undefined;
            trigger();
          });
        })();
      }

      return stored;
    },
    async set(newVal) {
      stored = newVal;
      const item = await storage;

      // Use a deep clone to remove proxies
      if (newVal === null) await item.removeValue();
      else await item.setValue(cloneDeep(newVal));
    },
  }));
}
