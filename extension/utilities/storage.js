import { sha1 } from 'hash-wasm';

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
 */
export function useStorage(storage) {
  /** @type {Ref<T>} */
  const item = ref();

  storage.getValue().then((val) => {
    ref.value = val;
    storage.watch((newVal) => ref.value = newVal);
  });

  return item;
}