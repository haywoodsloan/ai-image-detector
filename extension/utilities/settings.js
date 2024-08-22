import { useStorage, userSettings } from './storage.js';

export function useSettings() {
  return useStorage(userSettings);
}
