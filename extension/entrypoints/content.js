import { collectAllElementsDeep } from 'query-selector-shadow-dom';

const CssUrlRegex = /url\((?<url>[^\)]+)\)/;
const VisibilityThresh = 0.7;

export default defineContentScript({
  matches: ['<all_urls>'],

  runAt: 'document_idle',
  cssInjectionMode: 'ui',

  main(ctx) {
    console.log('Content script running');

    /** @type {Map<Element, ShadowRootContentScriptUi>} */
    const indicatorUis = new Map();

    const intersectionObs = new IntersectionObserver(
      async (entries) => {
        for (const { intersectionRatio, target } of entries) {
          if (
            intersectionRatio < VisibilityThresh &&
            indicatorUis.has(target)
          ) {
            console.log('image became non-visible', target);
            indicatorUis.get(target).remove();
          } else if (intersectionRatio >= VisibilityThresh) {
            console.log('new image became visible', target);
            indicatorUis.set(target, await createIndicatorUi(ctx, target));
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
  const ui = await createShadowRootUi(ctx, {
    name: 'detector-indicator',

    position: 'overlay',
    anchor: ele,

    onMount(container, shadow, host) {
      console.log('mounting indicator', container, shadow, host);
    },
  });

  ui.mount();
  return ui;
}
