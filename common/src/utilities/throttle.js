import { wait } from './sleep.js';

/**
 * @param {TimeSpan | number} limit
 */
export function createThrottle(limit) {
  /** @type {Array<{debounceKey?: any, func: () => void}>} */
  let queue = null;

  /**
   * @param {() => void} func
   * @param {{debounceKey?: any}}
   */
  return (func, { debounceKey } = {}) => {
    if (queue !== null) {
      if (debounceKey != null) {
        queue = queue.filter(({ debounceKey: key }) => key !== debounceKey);
      }

      queue.push({ debounceKey, func });
      return;
    }

    queue = [{ debounceKey, func }];
    (async () => {
      while (queue.length) {
        safeInvoke(queue.pop().func);
        await wait(limit);
      }
      queue = null;
    })();
  };
}

/**
 * @param {() => void} func
 */
function safeInvoke(func) {
  try {
    return func();
  } catch {
    // ignore
  }
}
