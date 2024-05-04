/**
 * @typedef {{
 *  isValid: boolean,
 *  error?: any
 * }} ValidationResult
 */

/**
 * @param {URL} url
 * @returns {Promise<ValidationResult>}
 */
export async function validateImageUrl(url) {
  try {
    const test = await fetch(url, { method: 'HEAD' });
    if (!test.ok) throw new Error(`HEAD request failed: ${test.statusText}`);

    const contentType = test.headers.get('Content-Type');
    const validHeader = contentType.startsWith('image/');
    if (!validHeader) throw new Error(`Invalid MIME type: ${contentType}`);

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error };
  }
}
