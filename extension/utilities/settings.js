import { useStorage, userSettings } from './storage.js';

export const useSettings = () => useStorage(userSettings);
