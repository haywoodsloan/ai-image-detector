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
 * @returns {WxtStorageItem<ImageAnalysis}
 */
export async function getAnalysisStorage(url) {
  const hash = await sha1(url);
  return storage.defineItem(`session:analysis-${hash}`);
}

/**
 * @template T
 * @param {WxtStorageItem<T>} storage
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

        storage.getValue().then((val) => {
          stored = val ?? undefined;
          trigger();

          storage.watch((newVal) => {
            stored = newVal ?? undefined;
            trigger();
          });
        });
      }

      return stored;
    },
    async set(newVal) {
      // Use a deep clone to remove proxies
      if (newVal === null) await storage.defaultValue();
      else await storage.setValue(cloneDeep(newVal));
    },
  }));
}
