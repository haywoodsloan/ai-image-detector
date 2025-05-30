import parse from 'color-parse';
import TimeSpan from 'common/utilities/TimeSpan.js';

import '@/styles/imgfix.scss';

import { getImageSrc } from './image.js';

const GridSize = 2;
const ExcludeRegex = /(image\/|\.)(gif|svg)(\W|$)/i;
const ImgFixDataName = 'imgfix-47dh3';

/** @type {IntersectionObserverInit} */
const IntersectObsOptions = {
  threshold: 0.2,
};

/** @type {MutationObserverInit} */
const StyleObsOptions = {
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class'],
};

/** @type {MutationObserverInit} */
const ChildObsOptions = {
  subtree: true,
  childList: true,
};

/**
 * @param {HTMLElement} ele
 */
export function isElementCovered(ele, inset = 0) {
  /** @type {Set<Element>} */
  const covering = new Set();

  for (const { x, y } of getElementGrid(ele, inset)) {
    try {
      ele.dataset[ImgFixDataName] = '';
      for (const topEle of elementsFromPoint(x, y)) {
        if (topEle === ele) return null;
        if (!isStyleHidden(topEle)) {
          covering.add(topEle);
          break;
        }
      }
    } finally {
      delete ele.dataset[ImgFixDataName];
    }
  }

  return [...covering];
}

/**
 * @param {Element} ele
 * @param {AbortSignal} [signal]
 */
export async function waitForStablePosition(ele, signal) {
  return new Promise((res) => {
    let rect = ele.getBoundingClientRect();
    requestAnimationFrame(function check() {
      if (signal?.aborted) res();
      const newRect = ele.getBoundingClientRect();

      if (!compareRects(rect, newRect)) {
        rect = newRect;
        requestAnimationFrame(check);
      } else res();
    });
  });
}

/**
 * @param {Element} ele
 */
export function isImageElement(ele) {
  if (ele.nodeName !== 'IMG') return false;

  const src = getImageSrc(ele);
  if (!src) return false;

  const { pathname } = new URL(src);
  return !ExcludeRegex.test(pathname);
}

/**
 * @param {Element} ele
 */
export function isStyleHidden(ele) {
  if (!ele.src && ele.tagName !== 'SVG') {
    const compStyle = getComputedStyle(ele);

    const bgColor = parse(compStyle.backgroundColor);
    const bgImage = compStyle.backgroundImage;

    if (bgColor.alpha <= 0.5 && bgImage === 'none') return true;
  }

  return (
    !ele.offsetParent ||
    ele.offsetWidth <= 1 ||
    ele.offsetHeight <= 1 ||
    !ele.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true,
      contentVisibilityAuto: true,
    })
  );
}

/**
 * @param {Element | ShadowRoot} ele
 */
export function getChildrenDeep(ele) {
  /** @type {Element[]} */
  const elements = [];
  const roots = [ele];

  /** @type {Element | ShadowRoot} */
  let root;

  while ((root = roots.pop())) {
    const children =
      root instanceof Element
        ? [...root.getElementsByTagName('*')]
        : [...root.querySelectorAll('*')];

    elements.push(...children);
    roots.push(
      ...children.filter((e) => e.shadowRoot).map((e) => e.shadowRoot)
    );
  }

  return elements;
}

/**
 * @param {Element} ele
 */
export function getParentChain(ele) {
  /** @type {Element[]} */
  const chain = [];
  let parent = ele.parentNode || ele.host;

  while (parent) {
    if (parent instanceof Element) chain.push(parent);
    parent = parent.parentNode || parent.host;
  }

  return chain;
}

/**
 *
 * @param {Element} ele
 * @param {() => any} callback
 * @param {{
 *    timeout?: number | TimeSpan,
 *    debounce?: number | TimeSpan,
 *    immediate?: boolean
 * }}
 */
export async function watchForViewUpdate(
  ele,
  callback,
  { debounce = TimeSpan.fromMilliseconds(100), immediate = false, timeout } = {}
) {
  let timeoutId = null;
  let debounceId = null;
  let nextDebounceTime;

  const debounceMs = debounce.valueOf();
  const reset = () => {
    nextDebounceTime = Date.now() + debounceMs;
    interObs.takeRecords();
    styleObs.takeRecords();

    if (!timeoutId && timeout) {
      timeoutId = setTimeout(() => {
        clearTimeout(debounceId);

        timeoutId = null;
        debounceId = null;

        interObs.takeRecords();
        styleObs.takeRecords();

        callback();
      }, timeout);
    }

    if (!debounceId) {
      let origTime = nextDebounceTime;
      debounceId = setTimeout(function check() {
        if (nextDebounceTime !== origTime) {
          origTime = nextDebounceTime;
          debounceId = setTimeout(check, origTime - Date.now());
        } else {
          clearTimeout(timeoutId);

          timeoutId = null;
          debounceId = null;

          interObs.takeRecords();
          styleObs.takeRecords();

          callback();
        }
      }, origTime - Date.now());
    }
  };

  const interObs = new IntersectionObserver(reset, IntersectObsOptions);
  const styleObs = new MutationObserver(reset);

  const childObs = new MutationObserver((mutations) => {
    reset();

    requestIdleCallback(() => {
      for (const mutation of mutations) {
        for (const newEle of mutation.addedNodes) {
          if (!(newEle instanceof Element)) continue;
          if (!newEle.isConnected) continue;

          interObs.observe(newEle);
          interObs.takeRecords();

          if (newEle.shadowRoot) {
            childObs.observe(newEle.shadowRoot, ChildObsOptions);
            styleObs.observe(newEle.shadowRoot, StyleObsOptions);

            for (const shadowChild of getChildrenDeep(newEle.shadowRoot)) {
              interObs.observe(shadowChild);
              interObs.takeRecords();
            }
          }
        }

        for (const oldEle of mutation.removedNodes) {
          if (!(oldEle instanceof Element)) continue;
          if (oldEle.isConnected) continue;
          interObs.unobserve(oldEle);
        }
      }
    });
  });

  childObs.observe(ele, ChildObsOptions);
  requestIdleCallback(() => {
    styleObs.observe(ele, StyleObsOptions);

    interObs.observe(ele);
    interObs.takeRecords();

    for (const child of getChildrenDeep(ele)) {
      interObs.observe(child);
      interObs.takeRecords();

      if (child.shadowRoot) {
        childObs.observe(child.shadowRoot, ChildObsOptions);
        styleObs.observe(child.shadowRoot, StyleObsOptions);
      }
    }
  });

  if (immediate) callback();
  return () => {
    clearTimeout(timeoutId);
    clearTimeout(debounceId);

    childObs.disconnect();
    styleObs.disconnect();
    interObs.disconnect();
  };
}

/**
 *
 * @param {Element} ele
 * @param {{
 *    timeout?: number | TimeSpan,
 *    debounce?: number | TimeSpan
 * }}
 */
export async function waitForStableView(
  ele,
  { debounce = TimeSpan.fromMilliseconds(100), timeout } = {}
) {
  await new Promise((res) => {
    let nextDebounceTime = Date.now() + debounce.valueOf();
    const reset = () => {
      nextDebounceTime = Date.now() + debounce.valueOf();
      styleObs.takeRecords();
      interObs.takeRecords();
    };

    let timeoutId, debounceId;
    if (timeout) {
      timeoutId = setTimeout(() => {
        clearTimeout(debounceId);
        childObs.disconnect();
        styleObs.disconnect();
        interObs.disconnect();
        res();
      }, timeout);
    }

    let origTime = nextDebounceTime;
    debounceId = setTimeout(function check() {
      if (origTime !== nextDebounceTime) {
        origTime = nextDebounceTime;
        debounceId = setTimeout(check, origTime - Date.now());
      } else {
        clearTimeout(timeoutId);
        childObs.disconnect();
        styleObs.disconnect();
        interObs.disconnect();
        res();
      }
    }, origTime - Date.now());

    const interObs = new IntersectionObserver(reset, IntersectObsOptions);
    const styleObs = new MutationObserver(reset);

    const childObs = new MutationObserver((mutations) => {
      reset();

      requestIdleCallback(() => {
        for (const mutation of mutations) {
          for (const newEle of mutation.addedNodes) {
            if (!(newEle instanceof Element)) continue;
            if (!newEle.isConnected) continue;

            interObs.observe(newEle);
            interObs.takeRecords();

            if (newEle.shadowRoot) {
              childObs.observe(newEle.shadowRoot, ChildObsOptions);
              styleObs.observe(newEle.shadowRoot, StyleObsOptions);

              for (const shadowChild of getChildrenDeep(newEle.shadowRoot)) {
                interObs.observe(shadowChild);
                interObs.takeRecords();
              }
            }
          }

          for (const oldEle of mutation.removedNodes) {
            if (!(oldEle instanceof Element)) continue;
            if (!oldEle.isConnected) continue;
            interObs.unobserve(oldEle);
          }
        }
      });
    });

    childObs.observe(ele, ChildObsOptions);
    requestIdleCallback(() => {
      styleObs.observe(ele, StyleObsOptions);

      interObs.observe(ele);
      interObs.takeRecords();

      for (const child of getChildrenDeep(ele)) {
        interObs.observe(child);
        interObs.takeRecords();

        if (child.shadowRoot) {
          childObs.observe(child.shadowRoot, ChildObsOptions);
          styleObs.observe(child.shadowRoot, StyleObsOptions);
        }
      }
    });
  });
}

/**
 * @param {Element} ele
 */
function getVisibleRect(ele) {
  if (!ele.offsetParent) return;

  // Ignore elements beyond the viewport
  const vw = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );

  const vh = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );

  // Use the element rect and offset parent rect
  const eleRect = ele.getBoundingClientRect();
  if (
    eleRect.bottom < 0 ||
    eleRect.right < 0 ||
    eleRect.top > vh ||
    eleRect.left > vw
  )
    return;

  // Use styles to determine if overflow is visible
  const offsetStyles = getComputedStyle(ele.offsetParent);
  const offsetRect = ele.offsetParent.getBoundingClientRect();

  let left, right;
  if (offsetStyles.overflowX === 'visible') {
    left = eleRect.left;
    right = eleRect.right;
  } else {
    if (offsetRect.left > vw || offsetRect.right < 0) return;
    left = Math.max(eleRect.left, offsetRect.left);
    right = Math.min(eleRect.right, offsetRect.right);
  }

  let top, bottom;
  if (offsetStyles.overflowY === 'visible') {
    top = eleRect.top;
    bottom = eleRect.bottom;
  } else {
    if (offsetRect.top > vh || offsetRect.bottom < 0) return;
    top = Math.max(eleRect.top, offsetRect.top);
    bottom = Math.min(eleRect.bottom, offsetRect.bottom);
  }

  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * @param {Element} ele
 */
function getElementGrid(ele, inset = 0) {
  // Use just the visible rect of the image
  const visRect = getVisibleRect(ele);
  if (!visRect) return [];

  const xInset = Math.max((visRect.width * inset) / 2, 1);
  const yInset = Math.max((visRect.height * inset) / 2, 1);

  const left = visRect.left + xInset;
  const top = visRect.top + yInset;
  const right = visRect.right - xInset;
  const bottom = visRect.bottom - yInset;

  const height = bottom - top;
  const width = right - left;

  /** @type {{x: number, y: number}[]} */
  const coords = [];

  // Check multiple points along a grid to estimate if the image is covered
  for (let i = 0; i <= GridSize; i++) {
    for (let j = 0; j <= GridSize; j++) {
      const x = width * (i / GridSize) + left;
      const y = height * (j / GridSize) + top;
      coords.push({ x, y });
    }
  }

  return coords;
}

/**
 * @param {number} x
 * @param {number} y
 */
function* elementsFromPoint(x, y) {
  // Get the initial stack and track the expanded shadow roots
  const stack = document.elementsFromPoint(x, y);

  /** @type {Set<Element>} */
  const expanded = new Set();

  // Walkthrough the elements at the given point expanding shadow roots
  while (stack.length) {
    const ele = stack.shift();
    if (ele.shadowRoot && !expanded.has(ele)) {
      const nested = ele.shadowRoot.elementsFromPoint(x, y);
      stack.unshift(...nested, ele);
      expanded.add(ele);
    } else yield ele;
  }
}

/**
 * @param {DOMRectReadOnly} rect1
 * @param {DOMRectReadOnly} rect2
 */
function compareRects(rect1, rect2) {
  return (
    rect1.top === rect2.top &&
    rect1.left === rect2.left &&
    rect1.bottom === rect2.bottom &&
    rect1.right === rect2.right
  );
}
