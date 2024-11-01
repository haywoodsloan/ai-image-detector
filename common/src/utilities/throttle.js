import { wait } from './sleep.js';

/**
 * @param {TimeSpan | number} limit
 */
export function createThrottle(limit) {
  /**
   * @type {{
   *   debounceKey?: any,
   *   async?: boolean
   *   func: () => void | Promise<void>
   * }[]}
   */
  let queue = null;

  /**
   * @param {() => void | Promise<void>} func
   * @param {{debounceKey?: any, async?: boolean}}
   */
  return (func, { debounceKey, async = false } = {}) => {
    if (queue !== null) {
      if (debounceKey != null) {
        queue = queue.filter(({ debounceKey: key }) => key !== debounceKey);
      }

      queue.push({ debounceKey, func, async });
      return;
    }

    queue = [{ debounceKey, func, async }];
    (async () => {
      while (queue.length) {
        const next = queue.pop();
        if (next.async) await safeInvoke(next.func);
        else safeInvoke(next.func);
        await wait(limit);
      }
      queue = null;
    })();
  };
}

/**
 * @param {() => any | Promise} func
 */
async function safeInvoke(func) {
  try {
    return await func();
  } catch {
    // ignore
  }
}
