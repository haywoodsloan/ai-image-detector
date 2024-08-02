import init, { InitAction } from './actions/init.js';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(({ action }, _, sendResponse) => {
    switch (action) {
      case InitAction:
        init()
          .then((result) => sendResponse({ result }))
          .catch((error) => sendResponse({ error }));
        return true;
    }
  });
});
