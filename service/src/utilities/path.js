/**
 * @param {string} path
 */
export function shortenPath(path) {
  return path.replace(/(^(?:[^/\\]*[/\\]){1,3}).*?([/\\][^/\\]*$)/, '$1...$2');
}
