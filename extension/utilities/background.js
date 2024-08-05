/**
 * @param {string} name
 * @returns {Promise<BackgroundTaskResult>}
 */
export function invokeBackgroundTask(name, data) {
  return browser.runtime.sendMessage({ name, data });
}
