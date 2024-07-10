import { collectAllElementsDeep } from 'query-selector-shadow-dom';

const CssUrlRegex = /url\((?<url>[^\)]+)\)/;
const VisibilityThresh = 0.7;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.log('Content script running');
    const visibleImages = new Set();
    const intersectionObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.intersectionRatio < VisibilityThresh &&
            visibleImages.has(entry.target)
          ) {
            console.log('image became non-visible', entry);
            visibleImages.delete(entry.target);
          } else if (entry.intersectionRatio >= VisibilityThresh) {
            console.log('new image became visible', entry);
            visibleImages.add(entry.target);
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
