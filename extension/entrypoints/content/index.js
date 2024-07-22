import IndicatorOverlay from '@/components/IndicatorOverlay.vue';
import { collectAllElementsDeep } from 'query-selector-shadow-dom';

import './style.css';

const CssUrlRegex = /url\((?<url>[^)]+)\)/;
const VisibilityThresh = 0.7;

export default defineContentScript({
  matches: ['<all_urls>'],

  runAt: 'document_idle',
  cssInjectionMode: 'ui',

  main(ctx) {
    console.log('Content script running');

    /** @type {Map<string, ShadowRootContentScriptUi>} */
    const indicatorUis = new Map();

    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        for (const { intersectionRatio, target } of entries) {
          const overlayId = target.dataset?.aidOverlayId;
          if (
            intersectionRatio < VisibilityThresh &&
            indicatorUis.has(overlayId)
          ) {
            console.log('image became non-visible', target, overlayId, indicatorUis);
            indicatorUis.get(overlayId).remove();
            indicatorUis.delete(overlayId);
            delete target.dataset.aidOverlayId;
          } else if (
            intersectionRatio >= VisibilityThresh &&
            !indicatorUis.has(overlayId)
          ) {
            console.log('new image became visible', target, overlayId, indicatorUis);
            target.dataset.aidOverlayId = randomId(8);
            indicatorUis.set(
              target.dataset.aidOverlayId,
              await createIndicatorUi(ctx, target)
            );
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

        for (const removedNode of allRemovedNodes) {
          intersectionObs.unobserve(removedNode);
        }

        const allNewNodes = [...mutation.addedNodes]
          .filter((node) => node instanceof Element)
          .flatMap((node) => [...collectAllElementsDeep(null, node), node]);

        for (const newNode of allNewNodes) {
          if (isImageElement(newNode)) {
            intersectionObs.observe(newNode);
          }
        }
      }
    });

    mutationObs.observe(document.body, { subtree: true, childList: true });
    for (const element of collectAllElementsDeep(null, document.body)) {
      if (isImageElement(element)) intersectionObs.observe(element);
    }
  },
});

/**
 * @param {Element} ele
 */
function isImageElement(ele) {
  return (
    ele.nodeName === 'IMG' ||
    CssUrlRegex.test(getComputedStyle(ele).backgroundImage) ||
    CssUrlRegex.test(getComputedStyle(ele, ':after').backgroundImage) ||
    CssUrlRegex.test(getComputedStyle(ele, ':before').backgroundImage)
  );
}

/**
 * @param {ContentScriptContext} ctx
 * @param {Element} ele
 */
async function createIndicatorUi(ctx, ele) {
  const wrapper = document.createElement('div');
  ele.parentNode.insertBefore(wrapper, ele);
  wrapper.appendChild(ele);

  wrapper.style.display = 'contents';
  wrapper.style.position = 'relative';

  const ui = await createShadowRootUi(ctx, {
    name: 'indicator-overlay',

    position: 'overlay',
    anchor: wrapper,
    append: 'last',

    onMount(container, shadow, host) {
      console.log('mounting indicator', container, shadow, host);

      host.style.position = "absolute";
      host.style.top = "0";
      host.style.left = "0";

      const app = createApp(IndicatorOverlay, { parent: ele });
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

function randomId(length = 8) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(chars.charAt(Math.floor(Math.random() * chars.length)));
  }

  return result.join('');
}
