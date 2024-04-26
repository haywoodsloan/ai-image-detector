/**
 * 
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
