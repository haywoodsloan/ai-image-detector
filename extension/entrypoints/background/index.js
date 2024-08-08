import { ApiError } from '@/api/base.js';

import * as actions from './actions';

export default defineBackground(() => {
  const actionMap = new Map();
  for (const key in actions) {
    /** @type {ActionType} */
    const action = actions[key];
    actionMap.set(action.actionName, action);
  }

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
    }

    throw new Error(`Missing action handler for ${name}`);
  });
});

/**
 * @param {Error | ApiError} error
 */
function convertError(error) {
  const converted = { message: error.message };
  if (error instanceof ApiError) converted.status = error.status;
  return converted;
}
