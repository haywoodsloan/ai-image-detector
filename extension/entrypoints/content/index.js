import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { InitAction } from '@/entrypoints/background/actions';
import { mergeSignals } from '@/utilities/abort.js';
import { invokeBackgroundTask } from '@/utilities/background.js';
import {
  getChildrenDeep,
  getCoveredElements,
  getParentChain,
  isElementCovered,
  isImageElement,
  isStyleHidden,
  waitForAnimations,
} from '@/utilities/element.js';
import { createAppEx } from '@/utilities/vue.js';

const MinVis = 0.2;
const VisThreshes = [0.2, 0.6, 1];

const AddObsOpts = {
  subtree: true,
  childList: true,
};

const StyleObsOpts = {
  attributes: true,
  attributeFilter: ['style', 'class'],
};

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    // Make sure the extension has been initialized
    await invokeBackgroundTask(InitAction);

    /** @type {Map<Element, ShadowRootContentScriptUi>} */
    const uiMap = new Map();

    /** @type {Map<Element, AbortController>} */
    const aborters = new Map();

    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        for (const { intersectionRatio, target } of entries) {
          aborters.get(target)?.abort();

          const aborter = new AbortController();
          aborters.set(target, aborter);

          const signal = aborter.signal;
          if (intersectionRatio < MinVis && uiMap.has(target)) {
            uiMap.get(target).remove();
            uiMap.delete(target);
          } else if (intersectionRatio >= MinVis && !uiMap.has(target)) {
            await waitForAnimations(target);
            if (signal.aborted) continue;

            if (isElementCovered(target)) continue;
            const ui = createIndicatorUi(target, signal);

            if (!signal.aborted) uiMap.set(target, ui);
            else ui?.remove();
          }

          // Remove the aborter when the operation is done
          if (aborters.get(target) === aborter) aborters.delete(target);
        }
      },
      { threshold: VisThreshes }
    );

    /** @type {Set<Element>} */
    const hiddenEls = new Set();
    const styleObs = new MutationObserver(async (mutations) => {
      for (const { target } of mutations) {
        aborters.get(target)?.abort();

        const targetAborter = new AbortController();
        aborters.set(target, targetAborter);

        const targetSignal = targetAborter.signal;
        const isHidden = isStyleHidden(target);

        if (isHidden === hiddenEls.has(target)) continue;
        if (isHidden) hiddenEls.add(target);
        else hiddenEls.delete(target);

        const justHidden = isHidden
          ? [...getChildrenDeep(target), target]
          : [...getCoveredElements(target)];

        const justRevealed = isHidden
          ? [...getCoveredElements(target)]
          : [...getChildrenDeep(target), target];

        for (const ele of justHidden) {
          if (targetSignal.aborted) break;
          if (isImageElement(ele) && uiMap.has(ele)) {
            uiMap.get(ele).remove();
            uiMap.delete(ele);
          }
        }

        for (const ele of justRevealed) {
          if (targetSignal.aborted) break;
          if (isImageElement(ele) && !uiMap.has(ele)) {
            aborters.get(ele)?.abort();

            const imgAborter = new AbortController();
            aborters.set(ele, imgAborter);

            const mergeSignal = mergeSignals(imgAborter.signal, targetSignal);
            await waitForAnimations(ele);
            if (mergeSignal.aborted) continue;

            if (isElementCovered(ele)) continue;
            const ui = createIndicatorUi(ele, mergeSignal);

            if (!mergeSignal.aborted) uiMap.set(ele, ui);
            else ui?.remove();

            if (aborters.get(ele) === imgAborter) aborters.delete(ele);
          }
        }

        if (aborters.get(target) === targetAborter) aborters.delete(target);
      }
    });

    const addObs = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        const removedNodes = [...mutation.removedNodes]
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...getChildrenDeep(node), node]);

        for (const node of removedNodes) {
          if (uiMap.has(node)) {
            uiMap.get(node).remove();
            uiMap.delete(node);
          }
        }

        const addedNodes = [...mutation.addedNodes]
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...getChildrenDeep(node), node]);

        for (const node of addedNodes) {
          watchElement(node);
        }
      }
    });

    requestAnimationFrame(() => {
      addObs.observe(document.body, AddObsOpts);
      for (const ele of getChildrenDeep(document.body)) {
        watchElement(ele);
      }
    });

    /**
     * @param {Element} ele
     */
    function watchElement(ele) {
      if (ele.shadowRoot) addObs.observe(ele.shadowRoot, AddObsOpts);
      if (isImageElement(ele)) {
        intersectionObs.observe(ele);

        for (const linked of [...getParentChain(ele), ele]) {
          if (isStyleHidden(linked)) hiddenEls.add(linked);
          styleObs.observe(linked, StyleObsOpts);
        }
      }
    }

    /**
     * @param {HTMLElement} image
     * @param {AbortSignal} signal
     */
    function createIndicatorUi(image, signal) {
      const ui = createIntegratedUi(ctx, {
        position: 'overlay',
        anchor: image,
        append: 'after',

        onMount(host) {
          if (signal.aborted) return;
          const app = createAppEx(IndicatorOverlay, { image, host });
          app.mount(host);
          return app;
        },

        onRemove(app) {
          app?.unmount();
        },
      });

      if (signal.aborted) return;
      ui.mount();

      return ui;
    }
  },
});
