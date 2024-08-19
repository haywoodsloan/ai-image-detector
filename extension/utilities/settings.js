import memoize from 'memoize';

import { useStorage, userSettings } from './storage.js';

export const useSettings = memoize(() => useStorage(userSettings));
