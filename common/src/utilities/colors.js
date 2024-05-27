import colors from 'cli-color';

// Single letter shorthand for console coloring
export const g = (...args) => colors.green(...args);
export const r = (...args) => colors.red(...args);
export const b = (...args) => colors.blue(...args);
export const y = (...args) => colors.yellow(...args);
