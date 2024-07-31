import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { createAppEx } from '@/utilities/vue.js';
import { collectAllElementsDeep } from 'query-selector-shadow-dom';

import './style.css';

const OverlapGridSize = 2;
const MutObsOpts = { subtree: true, childList: true };
const VisibilityThresh = 0.25;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  main(ctx) {
    /** @type {Map<Element, ShadowRootContentScriptUi>} */
    const uis = new Map();

    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        for (const { intersectionRatio, target } of entries) {
          requestAnimationFrame(async () => {
            if (intersectionRatio < VisibilityThresh && uis.has(target)) {
              uis.get(target).remove();
              uis.delete(target);
            } else if (
              intersectionRatio >= VisibilityThresh &&
              !isImageCovered(target)
            ) {
              const ui = await createIndicatorUi(ctx, target);
              uis.set(target, ui);
            }
          });
        }
      },
      { threshold: VisibilityThresh }
    );

    const mutationObs = new MutationObserver(async (mutations) => {
      const removedNodes = new Set(
        mutations
          .flatMap((mutation) => [...mutation.removedNodes])
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...collectAllElementsDeep(null, node), node])
      );

      for (const node of removedNodes) {
        intersectionObs.unobserve(node);
        if (uis.has(node)) {
          uis.get(node).remove();
          uis.delete(node);
        }
      }

      const addedNodes = new Set(
        mutations
          .flatMap((mutation) => [...mutation.addedNodes])
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...collectAllElementsDeep(null, node), node])
      );

      for (const node of addedNodes) {
        if (node.shadowRoot) mutationObs.observe(node.shadowRoot, MutObsOpts);
        if (isImageElement(node)) intersectionObs.observe(node);
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

      const stack = document.elementsFromPoint(x, y);
      const expanded = new Set();

      // Check if any visible element comes before the image
      // Expand shadow roots too
      while (stack.length) {
        const topEle = stack.shift();
        if (topEle === ele) return false;

        if (topEle.shadowRoot && !expanded.has(topEle)) {
          const nested = topEle.shadowRoot.elementsFromPoint(x, y);
          stack.unshift(...nested, topEle);
          expanded.add(topEle);
        } else if (getComputedStyle(topEle).visibility !== 'hidden') break;
      }
    }
  }

  return true;
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
