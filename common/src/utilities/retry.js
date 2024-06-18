import { wait } from './sleep.js';

/**
 * @param {number} retryLimit
 * @param {number | import('./TimeSpan.js').TimeSpan} timeout
 */
export function withRetry(retryLimit, timeout) {
  /**
   * @template T
   * @type {(
   *  action: () => Promise<T>,
   *  onerror: (error: Error, retryCount: number) => Promise<void>
   * ) => Promise<T>}
   */
  return async (action, onerror) => {
    let retryCount = 0;
    while (true) {
      try {
        return await action();
      } catch (error) {
        if (retryCount >= retryLimit) throw error;
        retryCount++;

        await wait(timeout * retryCount);
        await onerror(error, retryCount);
      }
    }
  };
}
