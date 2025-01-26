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

export function isFileUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'file:'
  } catch {
    // URL parse error
    return false;
  }
}

/**
 * @param {string} url
 */
export function isDataUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'data:';
  } catch {
    // URL parse error
    return false;
  }
}

/**
 * @param {string} url
 */
export function shortenUrl(url) {
  if (isHttpUrl(url) || isFileUrl(url)) {
    const { origin, pathname } = new URL(url);
    const endOfPath = pathname.substring(pathname.lastIndexOf('/') + 1);
    return `${origin}/.../${endOfPath}`;
  } else if (isDataUrl(url)) {
    return `${url.slice(0, 40)}...${url.slice(-20)}`;
  } else throw new Error(`Invalid url ${url}`);
}
