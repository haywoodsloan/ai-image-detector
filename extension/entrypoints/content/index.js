import TimeSpan from 'common/utilities/TimeSpan.js';

import AnalysisDialog from '@/components/AnalysisDialog.vue';
import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { invokeBackgroundTask } from '@/utilities/background.js';
import {
  getChildrenDeep,
  getParentChain,
  isElementCovered,
  isImageElement,
  isStyleHidden,
  waitForStableView,
  watchForViewUpdate,
} from '@/utilities/element.js';
import { userSettings } from '@/utilities/storage.js';
import { createAppEx } from '@/utilities/vue.js';

import { InitAction } from '../background/actions/init.js';
import { AnalyzeImageId } from '../background/index.js';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    const MinVis = 0.2;

    const UpdateDebounce = TimeSpan.fromMilliseconds(100);
    const UpdateTimeout = TimeSpan.fromMilliseconds(100);
    const InitTimeout = TimeSpan.fromSeconds(5);

    // Make sure the extension has been initialized
    await invokeBackgroundTask(InitAction);
    browser.runtime.onMessage.addListener(({ name, data }) => {
      if (name === AnalyzeImageId) {
        const ui = createDialogUi(data);
        ui.mount();
      }
    });

    // Check if we should do the auto check observing
    const site = location.host?.toLowerCase();
    const { autoCheck, disabledSites } = await userSettings.getValue();
    if (!autoCheck || disabledSites.includes(site)) return;

    /** @type {Map<Element, ShadowRootContentScriptUi>} */
    const uiMap = new Map();
    await waitForStableView(document.body, {
      timeout: InitTimeout,
      debounce: UpdateDebounce,
    });

    let aborter = new AbortController();
    watchForViewUpdate(document.body, onViewUpdate, {
      timeout: UpdateTimeout,
      debounce: UpdateDebounce,
      immediate: true,
    });

    async function onViewUpdate() {
      aborter.abort();
      aborter = new AbortController();

      /** @type {Map<HTMLElement, boolean>} */
      const hiddenCache = new Map();
      const signal = aborter.signal;

      for (const ele of getChildrenDeep(document.body)) {
        if (signal.aborted) return;
        if (!isImageElement(ele)) continue;

        const isHidden = [ele, ...getParentChain(ele)].some((link) => {
          const cached = hiddenCache.get(link);
          if (cached != null) return cached;

          const hidden = isStyleHidden(link);
          hiddenCache.set(link, hidden);

          return hidden;
        });

        if (isHidden || isElementCovered(ele, MinVis)) {
          if (uiMap.has(ele)) detachIndicator(ele, signal);
          continue;
        }

        if (!uiMap.has(ele)) {
          attachIndicator(ele, signal);
        }
      }
    }

    /**
     * @param {HTMLElement} image
     * @param {AbortSignal} signal
     */
    async function attachIndicator(image, signal) {
      await new Promise((res) => requestAnimationFrame(res));
      if (signal.aborted) return;

      const ui = createIndicatorUi(image);
      if (!signal.aborted) {
        uiMap.set(image, ui);
        ui.mount();
      }
    }

    /**
     * @param {HTMLElement} image
     * @param {AbortSignal} signal
     */
    async function detachIndicator(image, signal) {
      await new Promise((res) => requestAnimationFrame(res));
      if (signal.aborted) return;

      const ui = uiMap.get(image);
      if (!signal.aborted) {
        uiMap.delete(image);
        ui.remove();
      }
    }

    /**
     * @param {HTMLElement} image
     */
    function createIndicatorUi(image) {
      const ui = createIntegratedUi(ctx, {
        position: 'overlay',
        anchor: image,
        append: 'after',

        onMount(host) {
          const app = createAppEx(IndicatorOverlay, { image, host });
          app.mount(host);
          return app;
        },

        onRemove(app) {
          app?.unmount();
        },
      });

      return ui;
    }

    /**
     * @param {string} image
     */
    function createDialogUi(image) {
      const ui = createIntegratedUi(ctx, {
        position: 'overlay',
        anchor: document.body,

        onMount(host) {
          const app = createAppEx(AnalysisDialog, {
            image,
            onClose: () => ui.remove(),
          });

          app.mount(host);
          return app;
        },

        onRemove(app) {
          app?.unmount();
        },
      });

      return ui;
    }
  },
});
