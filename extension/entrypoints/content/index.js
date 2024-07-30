import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { createAppEx } from '@/utilities/vue.js';
import { randomId } from 'common/utilities/string.js';
import { collectAllElementsDeep } from 'query-selector-shadow-dom';

import './style.css';

const OverlapGridSize = 4;
const MutObsOpts = { subtree: true, childList: true };
const VisibilityThresh = 0.2;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  main(ctx) {
    /** @type {Map<string, ShadowRootContentScriptUi>} */
    const uis = new Map();

    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        for (const { intersectionRatio, target } of entries) {
          console.log('new intersection entry');
          const overlayId = target.dataset?.aidOverlayId;
          if (intersectionRatio < VisibilityThresh && uis.has(overlayId)) {
            delete target.dataset.aidOverlayId;
            uis.get(overlayId).remove();
            uis.delete(overlayId);
          } else if (
            intersectionRatio >= VisibilityThresh &&
            !overlayId &&
            !isImageCovered(target)
          ) {
            target.dataset.aidOverlayId = randomId(8);
            const ui = await createIndicatorUi(ctx, target);
            uis.set(target.dataset.aidOverlayId, ui);
          }
        }
      },
      { threshold: VisibilityThresh }
    );

    const mutationObs = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        const allRemovedNodes = [...mutation.removedNodes]
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...collectAllElementsDeep(null, node), node]);

        for (const node of allRemovedNodes) {
          intersectionObs.unobserve(node);

          const overlayId = node.dataset?.aidOverlayId;
          delete node.dataset.aidOverlayId;

          if (uis.has(overlayId)) {
            uis.get(overlayId).remove();
            uis.delete(overlayId);
          }
        }

        const allNewNodes = [...mutation.addedNodes]
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...collectAllElementsDeep(null, node), node]);

        for (const node of allNewNodes) {
          if (node.shadowRoot) mutationObs.observe(node.shadowRoot, MutObsOpts);
          if (isImageElement(node)) intersectionObs.observe(node);

          // Handle cloned images which have an overlay ID but not an actual UI
          const overlayId = node.dataset?.aidOverlayId;
          if (
            uis.has(overlayId) &&
            node.nextElementSibling !== uis.get(overlayId).shadowHost
          ) {
            node.dataset.aidOverlayId = randomId(8);
            const ui = await createIndicatorUi(ctx, node);
            uis.set(node.dataset.aidOverlayId, ui);
          }
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
 * @param {HTMLElement} ele
 */
function isImageCovered(ele) {
  if (getComputedStyle(ele).visibility === 'hidden') return true;

  const imgRect = ele.getBoundingClientRect();
  const offsetRect = ele.offsetParent.getBoundingClientRect();

  // Check just inside the visible area
  const left = Math.max(imgRect.left, offsetRect.left) + 1;
  const top = Math.max(imgRect.top, offsetRect.top) + 1;
  const right = Math.min(imgRect.right, offsetRect.right) - 1;
  const bottom = Math.min(imgRect.bottom, offsetRect.bottom) - 1;

  for (let i = 0; i <= OverlapGridSize; i++) {
    for (let j = 0; j <= OverlapGridSize; j++) {
      const x = (right - left) * (i / OverlapGridSize) + left;
      const y = (bottom - top) * (j / OverlapGridSize) + top;

      const stack = getElementsFromPoint(x, y);
      console.log(ele, [x,y], stack);
      for (const overlapping of stack) {
        if (overlapping === ele) return false;
        else if (getComputedStyle(overlapping).visibility !== 'hidden') break;
      }
    }
  }

  return true;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Element} [base]
 */
function getElementsFromPoint(x, y, base = null) {
  const root = base?.shadowRoot ?? document;
  const shallow = root.elementsFromPoint(x, y);

  return shallow.slice(0, shallow.indexOf(base)).flatMap((ele) => {
    if (ele.shadowRoot) return [...getElementsFromPoint(x, y, ele), ele];
    return ele;
  });
}

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
