/**
 * @param {string} url
 */
export async function getImageAsBlob(url) {
  const response = await fetch(url);
  return await response.blob();
}
