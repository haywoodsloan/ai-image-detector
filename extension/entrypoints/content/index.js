import AnalysisDialog from '@/components/AnalysisDialog.vue';
import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { mergeSignals } from '@/utilities/abort.js';
import { invokeBackgroundTask } from '@/utilities/background.js';
import {
  getChildrenDeep,
  getCoveredElements,
  getParentChain,
  isElementCovered,
  isImageElement,
  isStyleHidden,
} from '@/utilities/element.js';
import { waitForStablePosition } from '@/utilities/element.js';
import { userSettings } from '@/utilities/storage.js';
import { createAppEx } from '@/utilities/vue.js';

import { InitAction } from '../background/actions/init.js';
import { AnalyzeImageId } from '../background/index.js';

const MinVis = 0.2;
const VisThreshes = [0.2, 0.6, 1];

const AddObsOpts = {
  subtree: true,
  childList: true,
};

const StyleObsOpts = {
  attributes: true,
};

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    // Make sure the extension has been initialized
    await invokeBackgroundTask(InitAction);
    browser.runtime.onMessage.addListener(({ name, data }) => {
      if (name === AnalyzeImageId) createDialogUi(data);
    });

    // Check if we should do the auto check observing
    const site = location.host?.toLowerCase();
    const { autoCheck, disabledSites } = await userSettings.getValue();
    if (!autoCheck || disabledSites.includes(site)) return;

    /** @type {Map<Element, ShadowRootContentScriptUi>} */
    const uiMap = new Map();

    /** @type {Map<Element, Set<Element>} */
    const coveringMap = new Map();

    /** @type {Map<Element, AbortController>} */
    const aborters = new Map();

    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        for (const { intersectionRatio, target } of entries) {
          aborters.get(target)?.abort();

          const aborter = new AbortController();
          aborters.set(target, aborter);

          if (intersectionRatio < MinVis && uiMap.has(target)) {
            uiMap.get(target).remove();
            uiMap.delete(target);
          } else if (intersectionRatio >= MinVis && !uiMap.has(target)) {
            await attachIndicator(target, aborter.signal);
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

        const descendants = [...getChildrenDeep(target), target];
        const justHidden = !isHidden
          ? descendants.flatMap((ele) => [...getCoveredElements(ele)])
          : descendants;

        const justRevealed = isHidden
          ? descendants.flatMap((ele) => [...(coveringMap.get(ele) ?? [])])
          : descendants;

        if (isHidden) {
          for (const ele of descendants) {
            coveringMap.delete(ele);
          }
        }

        for (const ele of justHidden) {
          if (targetSignal.aborted) break;
          if (isImageElement(ele) && uiMap.has(ele)) {
            uiMap.get(ele).remove();
            uiMap.delete(ele);
          }
        }

        for (const ele of justRevealed) {
          if (targetSignal.aborted) break;
          if (ele.isConnected && isImageElement(ele) && !uiMap.has(ele)) {
            if (ele === target) {
              await attachIndicator(ele, targetSignal);
              continue;
            }

            aborters.get(ele)?.abort();
            const imgAborter = new AbortController();
            aborters.set(ele, imgAborter);

            const mergeSignal = mergeSignals(imgAborter.signal, targetSignal);
            await attachIndicator(ele, mergeSignal);
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

          if (coveringMap.has(node)) {
            const coveredEles = coveringMap.get(node);
            coveringMap.delete(node);

            for (const coveredEle of coveredEles) {
              if (coveredEle.isConnected) {
                aborters.get(coveredEle)?.abort();

                const aborter = new AbortController();
                aborters.set(coveredEle, aborter);

                await attachIndicator(coveredEle, aborter.signal);
              }
            }
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

        for (const linked of [ele, ...getParentChain(ele)]) {
          if (isStyleHidden(linked)) hiddenEls.add(linked);
          else hiddenEls.delete(linked);
          styleObs.observe(linked, StyleObsOpts);
        }

        if (!isStyleHidden(ele)) {
          const coveringEles = isElementCovered(ele);
          if (coveringEles) addCoveringElements(ele, coveringEles);
        }
      }
    }

    /**
     * @param {Element} ele
     * @param {Element[]} coveringEles
     */
    function addCoveringElements(ele, coveringEles) {
      for (const coveringEle of coveringEles) {
        if (!coveringMap.has(coveringEle))
          coveringMap.set(coveringEle, new Set());
        coveringMap.get(coveringEle).add(ele);

        for (const ancestor of [coveringEle, ...getParentChain(coveringEle)]) {
          if (isStyleHidden(ancestor)) hiddenEls.add(ancestor);
          else hiddenEls.delete(ancestor);
          styleObs.observe(ancestor, StyleObsOpts);
        }
      }
    }

    /**
     * @param {HTMLElement} image
     * @param {AbortSignal} signal
     */
    async function attachIndicator(image, signal) {
      await waitForStablePosition(image, signal);
      if (signal.aborted) return;

      for (const ele of [image, ...getParentChain(image)]) {
        if (isStyleHidden(ele)) {
          hiddenEls.add(ele);
          return;
        } else hiddenEls.delete(ele);
      }

      const coveringEles = isElementCovered(image);
      if (coveringEles) {
        addCoveringElements(image, coveringEles);
        return;
      }

      const ui = createIndicatorUi(image, signal);
      if (!signal.aborted) uiMap.set(image, ui);
      else ui?.remove();
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

      ui.mount();
      return ui;
    }
  },
});
