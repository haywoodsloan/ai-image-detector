import { randomBytes } from 'crypto';

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
export function randomString(length) {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .substring(0, length);
}

function stringify(val) {
  switch (typeof val) {
    case 'string':
      return val;
    case 'object':
      if (val instanceof Error) return val.message;
      if (Array.isArray(val)) return `[${val.join(', ')}]`;
      return `(${Object.entries(val)
        .map(([k, v]) => `${capitalize(k)}=${v}`)
        .join(', ')})`;
    default:
      return `${val}`;
  }
}
