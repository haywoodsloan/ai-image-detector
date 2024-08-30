import { checkAuth } from '@/api/auth.js';
import { ApiError } from '@/api/base.js';
import { userAuth } from '@/utilities/storage.js';

import * as actions from './actions';

export default defineBackground(async () => {
  // Add context menu
  browser.contextMenus.create({
    contexts: ['image'],
    title: 'Check if image is AI',
    id: 'analyze-image',
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'analyze-image') {
      console.log('menu item clicked');
    }
  });

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
    }

    throw new Error(`Missing action handler for ${name}`);
  });

  // If no auth yet just skip
  const auth = await userAuth.getValue();
  if (!auth) return;

  // If an auth exists check it's still valid
  try {
    const authUpdate = await checkAuth();
    await userAuth.setValue({ ...auth, ...authUpdate });
  } catch (error) {
    if (error.status === 401) await userAuth.removeValue();
    throw error;
  }
});

/**
 * @param {Error | ApiError} error
 */
function convertError(error) {
  const converted = { message: error.message };
  if (error instanceof ApiError) converted.status = error.status;
  return converted;
}
