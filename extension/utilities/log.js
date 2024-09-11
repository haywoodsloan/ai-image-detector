import { isProd } from 'common/utilities/environment.js';

export function debugError(error) {
  if (!isProd) console.error(error);
}
