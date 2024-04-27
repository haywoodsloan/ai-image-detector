import { resolve } from "path";

/**
 * @param {string} path
 */
export function shortenPath(path) {
  const absolute = resolve(path);
  return absolute.replace(
    /(^(?:[^\/\\]*[\/\\]){1,3}).*?([\/\\][^\/\\]*$)/,
    "$1...$2",
  );
}
