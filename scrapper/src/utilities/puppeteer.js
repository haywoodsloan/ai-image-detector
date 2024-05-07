/**
 * @param {ElementHandle<Element>} element
 * @param {number} timeout
 */
export async function waitForHidden(element, timeout) {
  await new Promise((res, rej) => {
    let intervalId, timeoutId;

    intervalId = setInterval(async () => {
      if (await element.isHidden()) {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        res();
      }
    }, 100);

    timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      rej(new Error("Element didn't become hidden before the timeout"));
    }, timeout);
  });
}
