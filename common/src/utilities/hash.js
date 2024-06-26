import { createHash } from 'crypto';

/**
 * @param {Buffer} data
 */
export function hashImage(data, { alg = 'sha1', url = false } = {}) {
  return createHash(alg)
    .update(data)
    .digest(url ? 'base64url' : 'base64');
}
