import colors from 'cli-color';

import { isLocal } from './environment.js';
import { l } from './string.js';

// Single letter shorthand for console coloring
export const g = (...args) =>
  isLocal
    ? colors.green(...interpolate(...args))
    : colors(...interpolate(...args));

export const r = (...args) =>
  isLocal
    ? colors.red(...interpolate(...args))
    : colors(...interpolate(...args));

export const b = (...args) =>
  isLocal
    ? colors.blue(...interpolate(...args))
    : colors(...interpolate(...args));

export const y = (...args) =>
  isLocal
    ? colors.yellow(...interpolate(...args))
    : colors(...interpolate(...args));

// Double letter shorthand for console coloring and log format in one
export const gl = (...args) => g(l(...args));
export const rl = (...args) => r(l(...args));
export const bl = (...args) => b(l(...args));
export const yl = (...args) => y(l(...args));

/**
 * @param {any[]} strs
 * @param  {...any} args
 */
function interpolate(strs, ...args) {
  // Check if this was called as a tagged template
  const isTag =
    strs?.length &&
    strs?.length === strs?.raw?.length &&
    strs?.length === args?.length + 1;

  // If not a tagged template call just pass the args along
  if (!isTag) return [strs, ...args];

  // If a tagged template call use standard string interpolation
  const builder = [];
  let idx = 0;

  for (; idx < strs.length; idx++) {
    builder.push(strs[idx]);
    if (args.length > idx) builder.push(`${args[idx]}`);
  }

  for (; idx < args.length; idx++) {
    builder.push(`${args[idx]}`);
  }

  return [builder.join('')];
}
