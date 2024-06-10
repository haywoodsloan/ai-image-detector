export function logObject(obj) {
  return `(${Object.entries(obj)
    .map(([key, value]) => `${capitalize(key)}=${value}`)
    .join(', ')})`;
}

/**
 * @param {string} str
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
