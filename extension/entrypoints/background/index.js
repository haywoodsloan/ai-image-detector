import * as actions from './actions';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(({ name, data }, _, sendResponse) => {
    for (const actionName in actions) {
      if (actionName === name) {
        /** @type {ActionType} */
        const action = actions[actionName];

        const raw = action.invoke(data);
        if (raw instanceof Promise) {
          raw
            .then((result) => sendResponse({ result }))
            .catch((error) => sendResponse({ error }));
          return true;
        }

        sendResponse({ result: raw });
      }
    }

    throw new Error(`Missing action handler for ${name}`);
  });
});
