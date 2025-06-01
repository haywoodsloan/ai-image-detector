import TimeSpan from 'common/utilities/TimeSpan.js';

import AnalysisDialog from '@/components/AnalysisDialog.vue';
import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { invokeBackgroundTask } from '@/utilities/background.js';
import {
  getChildrenDeep,
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

    const UpdateTimeout = TimeSpan.fromSeconds(5);
    const UpdateDebounce = TimeSpan.fromMilliseconds(175);
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
      debounce: UpdateDebounce,
      timeout: UpdateTimeout,
      immediate: true,
    });

    async function onViewUpdate() {
      aborter.abort();
      aborter = new AbortController();
      const signal = aborter.signal;

      const toRemove = new Set(uiMap.keys());
      const toAdd = new Set();

      const children = await getChildrenDeep(document.body, isImageElement);
      for (const ele of children) {
        if (signal.aborted) return;

        if (
          isElementMinSize(ele) &&
          !isStyleHidden(ele) &&
          !isElementCovered(ele, MinVis)
        ) {
          toRemove.delete(ele);
          toAdd.add(ele);
        }
      }

      for (const remove of toRemove) {
        if (signal.aborted) return;
        detachIndicator(remove, signal);
      }

      const addIt = toAdd.values().filter((e) => !uiMap.has(e));
      let add = addIt.next();

      if (!add.done) {
        requestAnimationFrame(function addUis() {
          if (signal.aborted) return;
          attachIndicator(add.value, signal);

          if (!(add = addIt.next()).done && !signal.aborted)
            requestAnimationFrame(addUis);
        });
      }
    }

    /**
     * @param {HTMLImageElement} ele
     */
    function isElementMinSize(ele) {
      return (
        ele.clientWidth > 100 &&
        ele.naturalWidth > 100 &&
        ele.clientHeight > 50 &&
        ele.naturalHeight > 50
      );
    }

    /**
     * @param {Element} image
     * @param {AbortSignal} signal
     */
    function attachIndicator(image, signal) {
      if (signal.aborted) return;
      const ui = createIndicatorUi(image);

      if (!signal.aborted) {
        uiMap.set(image, ui);
        ui.mount();
      }
    }

    /**
     * @param {Element} image
     * @param {AbortSignal} signal
     */
    async function detachIndicator(image, signal) {
      if (signal.aborted) return;
      const ui = uiMap.get(image);

      if (ui && !signal.aborted) {
        uiMap.delete(image);
        ui.remove();
      }
    }

    /**
     * @param {Element} image
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
