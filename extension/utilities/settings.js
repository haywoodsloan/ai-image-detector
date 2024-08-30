import { useStorage, userSettings } from './storage.js';

export function useSettings() {
  const storedSettings = useStorage(userSettings);
  return computed({
    get: () => storedSettings.value,
    set(newVal) {
      newVal.disabledSites = newVal.disabledSites.map((s) => s.toLowerCase());
      storedSettings.value = newVal;
    },
  });
}
