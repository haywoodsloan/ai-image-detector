import { createHash } from 'crypto';

/**
 * @param {Buffer} data
 */
export function hashImage(data) {
  return createHash('sha1').update(data).digest('base64');
}
