import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { createAppEx } from '@/utilities/vue.js';
import { randomId } from 'common/utilities/string.js';
import { collectAllElementsDeep } from 'query-selector-shadow-dom';

import './style.css';

const MutObsOpts = { subtree: true, childList: true };
const VisibilityThresh = 0.2;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  main(ctx) {
    console.log('Content script running');

    /** @type {Map<string, ShadowRootContentScriptUi>} */
    const uiMap = new Map();
    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          const overlayId = entry.target.dataset?.aidOverlayId;
          if (
            entry.intersectionRatio < VisibilityThresh &&
            uiMap.has(overlayId)
          ) {
            delete entry.target.dataset.aidOverlayId;
            uiMap.get(overlayId).remove();
            uiMap.delete(overlayId);
          } else if (
            entry.intersectionRatio >= VisibilityThresh &&
            !overlayId
          ) {
            entry.target.dataset.aidOverlayId = randomId(8);
            const ui = await createIndicatorUi(ctx, entry.target);
            uiMap.set(entry.target.dataset.aidOverlayId, ui);
          }
        }
      },
      { threshold: VisibilityThresh }
    );

    const mutationObs = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const allRemovedNodes = [...mutation.removedNodes]
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...collectAllElementsDeep(null, node), node]);

        for (const node of allRemovedNodes) {
          intersectionObs.unobserve(node);
          
          // TODO fix
          const overlayId = node.dataset?.aidOverlayId;
          delete node.dataset.aidOverlayId;

          if (uiMap.has(overlayId)) {
            uiMap.get(overlayId).remove();
            uiMap.delete(overlayId);
          }
        }

        const allNewNodes = [...mutation.addedNodes]
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...collectAllElementsDeep(null, node), node]);

        for (const node of allNewNodes) {
          if (node.shadowRoot) mutationObs.observe(node.shadowRoot, MutObsOpts);
          if (isImageElement(node)) intersectionObs.observe(node);
        }
      }
    });

    requestAnimationFrame(() => {
      mutationObs.observe(document.body, MutObsOpts);
      for (const node of collectAllElementsDeep(null, document.body)) {
        if (node.shadowRoot) mutationObs.observe(node.shadowRoot, MutObsOpts);
        if (isImageElement(node)) intersectionObs.observe(node);
      }
    });
  },
});

/**
 * @param {Element} ele
 */
function isImageElement(ele) {
  return ele.nodeName.toLowerCase() === 'img';
}

/**
 * @param {ContentScriptContext} ctx
 * @param {HTMLElement} image
 */
async function createIndicatorUi(ctx, image) {
  const ui = await createShadowRootUi(ctx, {
    name: 'indicator-overlay',
    isolateEvents: true,

    position: 'overlay',
    anchor: image,
    append: 'after',

    onMount(container, _, host) {
      const app = createAppEx(IndicatorOverlay, { image, host });
      app.mount(container);
      return app;
    },

    onRemove(app) {
      app?.unmount();
    },
  });

  ui.mount();
  return ui;
}
