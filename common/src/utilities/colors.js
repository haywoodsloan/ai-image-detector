import colors from 'cli-color';

// Single letter shorthand for console coloring
export const g = (...args) => colors.green(...interpolate(...args));
export const r = (...args) => colors.red(...interpolate(...args));
export const b = (...args) => colors.blue(...interpolate(...args));
export const y = (...args) => colors.yellow(...interpolate(...args));

/**
 * @param {any[]} strs
 * @param  {...any} args
 */
function interpolate(strs, ...args) {
  const isTag =
    strs?.length > 0 &&
    strs?.length === strs?.raw?.length &&
    strs?.length === args?.length + 1;
    
  if (!isTag) return [strs, ...args];
  const builder = [];

  let idx = 0;
  for (; idx < strs.length; idx++) {
    builder.push(strs[idx]);
    if (args[idx]) builder.push(`${args[idx]}`);
  }

  for (; idx < args.length; idx++) {
    builder.push(`${args[idx]}`);
  }

  return [builder.join('')];
}
