/**
 * @param {string} action
 * @returns {Promise<BackgroundTaskReturn>}
 */
export function invokeBackgroundTask(action) {
  return browser.runtime.sendMessage({ action });
}
