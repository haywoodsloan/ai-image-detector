import { ApiError } from '@/api/base.js';

import * as actions from './actions';

export const AnalyzeImageId = 'analyze-image';

export default defineBackground(() => {
  // Create a map of task names to the task definition
  const actionMap = new Map();
  for (const key in actions) {
    /** @type {ActionType} */
    const action = actions[key];
    actionMap.set(action.actionName, action);
  }

  // Handle background tasks being sent
  browser.runtime.onMessage.addListener(({ name, data }, _, sendResponse) => {
    if (actionMap.has(name)) {
      try {
        const raw = actionMap.get(name).invoke(data);
        if (raw instanceof Promise) {
          raw
            .then((result) => sendResponse({ result }))
            .catch((error) => sendResponse({ error: convertError(error) }));
          return true;
        }

        sendResponse({ result: raw });
      } catch (error) {
        sendResponse({ error: convertError(error) });
      }
    } else throw new Error(`Missing action handler for ${name}`);
  });
});

/**
 * @param {Error | ApiError} error
 */
function convertError(error) {
  const converted = { message: error.message, stack: error.stack };
  if (error instanceof ApiError) converted.status = error.status;
  if (error.name === 'AbortError') converted.name = 'AbortError';
  return converted;
}
