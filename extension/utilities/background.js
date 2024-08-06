/**
 * @param {ActionType} task
 * @returns {Promise<BackgroundTaskResult>}
 */
export function invokeBackgroundTask(task, data) {
  return browser.runtime.sendMessage({ name: task.actionName, data });
}
