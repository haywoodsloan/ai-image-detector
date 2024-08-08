import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { invokeBackgroundTask } from '@/utilities/background.js';
import { createAppEx } from '@/utilities/vue.js';
import { ActionQueue } from 'common/utilities/ActionQueue.js';
import { collectAllElementsDeep } from 'query-selector-shadow-dom';

import { InitAction } from '../background/actions';
import './style.css';

const OverlapGridSize = 2;
const OverlapInsetSize = 1;

const MutObsOpts = { subtree: true, childList: true };
const VisThreshes = [0.2, 0.6, 1];
const MinVis = 0.2;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('starting content script, waiting for init');
    const init = await invokeBackgroundTask(InitAction);
    console.log('init complete', init);

    /** @type {Map<Element, ShadowRootContentScriptUi>} */
    const uiMap = new Map();

    const intersectActionQueue = new ActionQueue();
    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        intersectActionQueue.queue(async () => {
          for (const { intersectionRatio, target } of entries) {
            if (intersectionRatio < MinVis && uiMap.has(target)) {
              uiMap.get(target).remove();
              uiMap.delete(target);
            } else if (intersectionRatio >= MinVis && !uiMap.has(target)) {
              await waitForAnimations(target);
              if (isImageCovered(target)) continue;
              const ui = await createIndicatorUi(ctx, target);
              uiMap.set(target, ui);
            }
          }
        });
      },
      { threshold: VisThreshes }
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
        if (uiMap.has(node)) {
          uiMap.get(node).remove();
          uiMap.delete(node);
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
  const left = Math.max(imgRect.left, offsetRect.left) + OverlapInsetSize;
  const top = Math.max(imgRect.top, offsetRect.top) + OverlapInsetSize;
  const right = Math.min(imgRect.right, offsetRect.right) - OverlapInsetSize;
  const bottom = Math.min(imgRect.bottom, offsetRect.bottom) - OverlapInsetSize;

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
async function waitForAnimations(ele) {
  await Promise.all(
    ele.getAnimations({ subtree: true }).map(({ finished }) => finished)
  );
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
  const { visibility, opacity } = getComputedStyle(image);
  console.log('creating ui', image, { visibility, opacity });

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
