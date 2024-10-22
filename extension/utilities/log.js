import { isProd } from 'common/utilities/environment.js';

export function debugError(...args) {
  if (!isProd) console.error(...args);
}

export function debugWarn(...args) {
  if (!isProd) console.warn(...args);
}