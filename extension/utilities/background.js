/**
 * @param {string} action
 */
export function invokeBackgroundTask(action) {
  return browser.runtime.sendMessage({ action });
}
