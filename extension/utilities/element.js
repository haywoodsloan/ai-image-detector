import TimeSpan from 'common/utilities/TimeSpan.js';

const GridSize = 2;
const IntersectThresholds = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const MutationOptions = { attributes: true, childList: true, subtree: true };

/**
 * @param {HTMLElement} ele
 */
export function isElementCovered(ele, inset = 0) {
  /** @type {Set<HTMLElement>} */
  const covering = new Set();

  for (const { x, y } of getElementGrid(ele, inset)) {
    for (const topEle of elementsFromPoint(x, y)) {
      if (topEle === ele) return null;

      const chain = [topEle, ...getParentChain(topEle)];
      const isHidden = chain.some((ancestor) => isStyleHidden(ancestor));

      if (!isHidden) {
        covering.add(topEle);
        break;
      }
    }
  }

  return [...covering];
}

/**
 * @param {HTMLElement} ele
 */
export function* getCoveredElements(ele) {
  if (isStyleHidden(ele)) return;
  for (const { x, y } of getElementGrid(ele)) {
    for (const topEle of elementsFromPoint(x, y)) {
      if (topEle === ele) continue;

      const chain = [topEle, ...getParentChain(topEle)];
      const isHidden = chain.some((ancestor) => isStyleHidden(ancestor));

      if (!isHidden) {
        yield topEle;
        break;
      }
    }
  }
}

/**
 * @param {HTMLElement} ele
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
 * @param {HTMLElement} ele
 */
export function isImageElement(ele) {
  return ele.nodeName === 'IMG';
}

/**
 * @param {HTMLElement} ele
 */
export function isStyleHidden(ele) {
  const styles = getComputedStyle(ele);
  return (
    styles.visibility === 'hidden' ||
    parseFloat(styles.opacity) === 0 ||
    styles.display === 'none' ||
    (parseFloat(styles.width) <= 1 && parseFloat(styles.height) <= 1)
  );
}

/**
 * @param {HTMLElement} ele
 */
export function* getChildrenDeep(ele) {
  const stack = [...ele.children];
  while (stack.length) {
    const ele = stack.pop();

    stack.push(...ele.children);
    if (ele.shadowRoot) stack.push(...ele.shadowRoot.children);

    yield ele;
  }
}

/**
 * @param {HTMLElement} ele
 */
export function* getParentChain(ele) {
  let parent = ele.parentNode || ele.host;
  while (parent) {
    if (parent instanceof HTMLElement) yield parent;
    parent = parent.parentNode || parent.host;
  }
}

/**
 *
 * @param {HTMLElement} ele
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
  {
    debounce = TimeSpan.fromMilliseconds(100),
    timeout = Infinity,
    immediate = false,
  } = {}
) {
  let timeoutId = null;
  let debounceId = null;

  const reset = () => {
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        clearTimeout(debounceId);

        timeoutId = null;
        debounceId = null;

        console.log('invoking view update watch by timeout');
        callback();
      }, timeout);
    }

    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      clearTimeout(timeoutId);

      timeoutId = null;
      debounceId = null;

      console.log('invoking view update watch normally');
      callback();
    }, debounce);
  };

  const resizeObs = new ResizeObserver(reset);
  const interObs = new IntersectionObserver(reset, {
    threshold: IntersectThresholds,
  });

  const mutateObs = new MutationObserver((mutations) => {
    reset();
    for (const mutation of mutations) {
      if (mutation.addedNodes?.length) {
        for (const newEle of mutation.addedNodes) {
          if (!(newEle instanceof Element)) continue;

          resizeObs.observe(newEle);
          interObs.observe(newEle);

          if (newEle.shadowRoot) {
            mutateObs.observe(newEle, MutationOptions);

            for (const shadowChild of getChildrenDeep(newEle.shadowRoot)) {
              resizeObs.observe(shadowChild);
              interObs.observe(shadowChild);
            }
          }
        }
      }
    }
  });

  mutateObs.observe(ele, MutationOptions);
  for (const child of getChildrenDeep(ele)) {
    if (child.shadowRoot) mutateObs.observe(child, MutationOptions);
    resizeObs.observe(child);
    interObs.observe(child);
  }

  if (immediate) callback();
  return () => {
    clearTimeout(timeoutId);
    clearTimeout(debounceId);

    mutateObs.disconnect();
    interObs.disconnect();
    resizeObs.disconnect();
  };
}

/**
 *
 * @param {HTMLElement} ele
 * @param {{
 *    timeout?: number | TimeSpan,
 *    debounce?: number | TimeSpan
 * }}
 */
export async function waitForStableView(
  ele,
  { debounce = TimeSpan.fromMilliseconds(100), timeout = Infinity } = {}
) {
  await new Promise((res) => {
    let timeoutId, debounceId;
    const reset = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        clearTimeout(timeoutId);
        mutateObs.disconnect();
        resizeObs.disconnect();
        interObs.disconnect();
        res();
      }, debounce);
    };

    timeoutId = setTimeout(() => {
      clearTimeout(debounceId);
      mutateObs.disconnect();
      resizeObs.disconnect();
      interObs.disconnect();
      res();
    }, timeout);

    const resizeObs = new ResizeObserver(reset);
    const interObs = new IntersectionObserver(reset, {
      threshold: IntersectThresholds,
    });

    const mutateObs = new MutationObserver((mutations) => {
      reset();
      for (const mutation of mutations) {
        if (mutation.addedNodes?.length) {
          for (const newEle of mutation.addedNodes) {
            if (!(newEle instanceof Element)) continue;

            resizeObs.observe(newEle);
            interObs.observe(newEle);

            if (newEle.shadowRoot) {
              mutateObs.observe(newEle, MutationOptions);

              for (const shadowChild of getChildrenDeep(newEle.shadowRoot)) {
                resizeObs.observe(shadowChild);
                interObs.observe(shadowChild);
              }
            }
          }
        }
      }
    });

    mutateObs.observe(ele, MutationOptions);
    for (const child of getChildrenDeep(ele)) {
      if (child.shadowRoot) mutateObs.observe(child, MutationOptions);
      resizeObs.observe(child);
      interObs.observe(child);
    }

    reset();
  });
}

/**
 * @param {HTMLElement} ele
 */
function getVisibleRect(ele) {
  if (!ele.offsetParent) return;

  // Use the element rect and offset parent rect
  const eleRect = ele.getBoundingClientRect();
  const offsetRect = ele.offsetParent.getBoundingClientRect();

  // Use styles to determine if overflow is visible
  const offsetStyles = getComputedStyle(ele.offsetParent);

  let left, right;
  if (offsetStyles.overflowX === 'visible') {
    left = eleRect.left;
    right = eleRect.right;
  } else {
    left = Math.max(eleRect.left, offsetRect.left);
    right = Math.min(eleRect.right, offsetRect.right);
  }

  let top, bottom;
  if (offsetStyles.overflowY === 'visible') {
    top = eleRect.top;
    bottom = eleRect.bottom;
  } else {
    top = Math.max(eleRect.top, offsetRect.top);
    bottom = Math.min(eleRect.bottom, offsetRect.bottom);
  }

  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * @param {HTMLElement} ele
 */
function* getElementGrid(ele, inset = 0) {
  // Use just the visible rect of the image
  const visRect = getVisibleRect(ele);
  if (!visRect) return;

  const xInset = Math.min((visRect.width * inset) / 2, 1);
  const yInset = Math.min((visRect.height * inset) / 2, 1);

  const left = visRect.left + xInset;
  const top = visRect.top + yInset;
  const right = visRect.right - xInset;
  const bottom = visRect.bottom - yInset;

  // Check multiple points along a grid to estimate if the image is covered
  for (let i = 0; i <= GridSize; i++) {
    for (let j = 0; j <= GridSize; j++) {
      const x = (right - left) * (i / GridSize) + left;
      const y = (bottom - top) * (j / GridSize) + top;
      yield { x, y };
    }
  }
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
