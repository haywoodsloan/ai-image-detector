const GridSize = 2;
const GridInset = 1;

/**
 * @param {HTMLElement} ele
 */
export function isElementCovered(ele) {
  // If hidden skip immediately
  if (isStyleHidden(ele)) return true;

  for (const { x, y } of getElementGrid(ele)) {
    for (const topEle of elementsFromPoint(x, y)) {
      if (topEle === ele) return false;
      else if (!isStyleHidden(topEle)) break;
    }
  }

  return true;
}

/**
 * @param {Element} ele
 */
export function* getCoveredElements(ele) {
  for (const { x, y } of getElementGrid(ele)) {
    for (const topEle of elementsFromPoint(x, y)) {
      if (topEle !== ele && !isStyleHidden(topEle)) {
        yield topEle;
        break;
      }
    }
  }
}

/**
 * @param {Element} ele
 */
export async function waitForAnimations(ele) {
  await Promise.all(
    ele.getAnimations({ subtree: true }).map(({ finished }) => finished)
  );
}

/**
 * @param {Element} ele
 */
export function isImageElement(ele) {
  return ele.nodeName === 'IMG';
}

/**
 * @param {Element} ele
 */
export function isStyleHidden(ele) {
  const styles = getComputedStyle(ele);
  return (
    styles.visibility === 'hidden' ||
    Number(styles.opacity) === 0 ||
    styles.display === 'none'
  );
}

/**
 * @param {Element} ele
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
 * @param {Element} ele 
 */
export function* getParentChain(ele) {
  let parent = ele.parentNode;
  while(parent) {
    if (parent instanceof Element) yield parent;
    parent = parent.parentNode || parent.host;
  }
}

/**
 * @param {HTMLElement} ele 
 */
function getVisibleRect(ele) {
  if (!ele.offsetParent) console.log('no offset parent for', ele);

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
 * @param {Element} ele
 */
function* getElementGrid(ele) {
  // Use just the visible rect of the image
  const visRect = getVisibleRect(ele);

  const left = visRect.left + GridInset;
  const top = visRect.top + GridInset;
  const right = visRect.right - GridInset;
  const bottom = visRect.bottom - GridInset;

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