import { createHash as cryptoHash } from 'crypto';

/**
 * @param {Buffer | string} data
 */
export function createHash(data, { alg = 'sha1', encoding = 'utf8' } = {}) {
  return cryptoHash(alg).update(data, encoding).digest('base64url');
}
