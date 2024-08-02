import init, { InitAction } from './actions/init.js';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(({ action }, _, sendResponse) => {
    switch (action) {
      case InitAction:
        init()
          .then((success) => sendResponse({ success }))
          .catch((error) => sendResponse({ success: false, error }));
        return true;
    }
  });
});
