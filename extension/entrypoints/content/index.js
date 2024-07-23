import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { randomId } from 'common/utilities/string.js';
import { collectAllElementsDeep } from 'query-selector-shadow-dom';

import './style.css';

const MutObsOpts = { subtree: true, childList: true };
const CssUrlRegex = /url\((?<url>[^)]+)\)/;
const VisibilityThresh = 0.2;

export default defineContentScript({
  matches: ['<all_urls>'],

  runAt: 'document_start',
  cssInjectionMode: 'ui',

  main(ctx) {
    console.log('Content script running');

    /** @type {Map<string, ShadowRootContentScriptUi>} */
    const uis = new Map();
    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        for (const { intersectionRatio, target } of entries) {
          const overlayId = target.dataset?.aidOverlayId;
          if (intersectionRatio < VisibilityThresh && uis.has(overlayId)) {
            delete target.dataset.aidOverlayId;
            uis.get(overlayId).remove();
            uis.delete(overlayId);
          } else if (intersectionRatio >= VisibilityThresh && !overlayId) {
            target.dataset.aidOverlayId = randomId(8);
            const ui = await createIndicatorUi(ctx, target);
            uis.set(target.dataset.aidOverlayId, ui);
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

    mutationObs.observe(document.body, MutObsOpts);
    for (const node of collectAllElementsDeep(null, document.body)) {
      if (node.shadowRoot) mutationObs.observe(node.shadowRoot, MutObsOpts);
      if (isImageElement(node)) intersectionObs.observe(node);
    }
  },
});

/**
 * @param {Element} ele
 */
function isImageElement(ele) {
  return (
    ele.nodeName.toLowerCase() === 'img' ||
    CssUrlRegex.test(getComputedStyle(ele).backgroundImage) ||
    CssUrlRegex.test(getComputedStyle(ele, ':after').backgroundImage) ||
    CssUrlRegex.test(getComputedStyle(ele, ':before').backgroundImage)
  );
}

/**
 * @param {ContentScriptContext} ctx
 * @param {HTMLElement} ele
 */
async function createIndicatorUi(ctx, ele) {
  const ui = await createShadowRootUi(ctx, {
    name: 'indicator-overlay',

    position: 'overlay',
    anchor: ele,
    append: 'after',

    onMount(container, _, host) {
      const eleRect = ele.getBoundingClientRect();
      const offsetRect = ele.offsetParent.getBoundingClientRect();

      const top = eleRect.top - offsetRect.top;
      const left = eleRect.left - offsetRect.left;

      host.style.position = 'absolute';
      host.style.top = `${top}px`;
      host.style.left = `${left}px`;

      const app = createApp(IndicatorOverlay, {
        imageEle: ele,
      });

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
