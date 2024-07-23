import { randomBytes } from 'crypto';

import { flattenAggregateError } from './error.js';

/**
 * @param {string} str
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 *
 * @param {string[]} strs
 * @param  {...any} args
 */
export function l(strs, ...args) {
  const builder = [];

  let idx = 0;
  for (; idx < strs.length; idx++) {
    builder.push(strs[idx]);
    if (args[idx]) builder.push(stringify(args[idx]));
  }

  for (; idx < args.length; idx++) {
    builder.push(stringify(args[idx]));
  }

  return builder.join('');
}

/**
 * @param {number} length
 */
export function cryptoString(length) {
  const byteCount = Math.ceil((length * 3) / 4);
  const str = randomBytes(byteCount).toString('base64url');
  return str.substring(0, length);
}

export function randomId(length = 8) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(chars.charAt(Math.floor(Math.random() * chars.length)));
  }

  return result.join('');
}

function stringify(val) {
  switch (typeof val) {
    case 'string':
      return val;
    case 'object':
      if (Array.isArray(val)) return `[${val.join(', ')}]`;
      if (val instanceof Error) {
        const errors =
          val instanceof AggregateError ? flattenAggregateError(val) : [val];

        return `[\n${errors
          .map(({ stack }) => {
            const [errMsg, errLoc] = stack.split(/\r?\n\s*/);
            return `    ${errMsg} ${errLoc}`;
          })
          .join(',\n')}\n]`;
      }

      return `(${Object.entries(val)
        .map(([k, v]) => `${capitalize(k)}=${v}`)
        .join(', ')})`;
    default:
      return `${val}`;
  }
}
