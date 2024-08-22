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
  /** @type {Ref<T | null>} */
  const item = ref(null);

  storage.getValue().then((val) => {
    item.value = val ?? undefined;
    storage.watch((newVal) => (item.value = newVal ?? undefined));
  });

  return item;
}
