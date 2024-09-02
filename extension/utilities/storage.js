import cloneDeep from 'clone-deep';
import { sha1 } from 'hash-wasm';

/** @type {WxtStorageItem<UserSettings>} */
export const userSettings = storage.defineItem('sync:userSettings', {
  defaultValue: {
    autoCheck: true,
    autoCheckPrivate: false,

    uploadImages: true,
    uploadImagesPrivate: false,

    disabledSites: [],
  },
});

/** @type {WxtStorageItem<UserAuth>} */
export const userAuth = storage.defineItem('sync:userAuth');

/**
 * @param {string} url
 */
export async function getAnalysisStorage(url) {
  const hash = await sha1(url);

  /** @type {WxtStorageItem<ImageAnalysis>} */
  const item = storage.defineItem(`session:analysis-${hash}`);

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
