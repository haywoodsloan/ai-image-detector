/**
 * @param {string} url
 */
export async function getImageAsBlob(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'image/*',
    },
  });
  return await response.blob();
}
