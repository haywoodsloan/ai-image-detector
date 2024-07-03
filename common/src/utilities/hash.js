import { createHash as cryptoHash } from 'crypto';

/**
 * @param {Buffer | string} data
 * @param {{alg: string, url: boolean, encoding: Encoding}} options
 */
export function createHash(data, { alg = 'sha1', encoding = 'utf8' } = {}) {
  return cryptoHash(alg).update(data, encoding).digest('base64url');
}
