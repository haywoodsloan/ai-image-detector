import { ApiError } from '@/api/base.js';

/**
 * @param {ActionType} task
 */
export async function invokeBackgroundTask(task, data) {
  const { result, error } = await browser.runtime.sendMessage({
    name: task.actionName,
    data,
  });

  if (error) {
    const message = `[${task.actionName}] ${error.message}\n${error.stack}`;
    if (error.status) throw new ApiError(error.status, message);
    throw new Error(message);
  }

  return result;
}
