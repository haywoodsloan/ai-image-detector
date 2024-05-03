/**
 * @param {string} url
 */
export function isHttpUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    // URL parse error
    return false;
  }
}

/**
 * @param {string} url
 */
export function shortenUrl(url) {
  const { origin, pathname } = new URL(url);
  const endOfPath = pathname.replace(/.*?\/([^\/]+)$/, '$1');
  return `${origin}/.../${endOfPath}`;
}
