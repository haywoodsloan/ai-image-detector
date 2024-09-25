import { wait } from './sleep.js';

/** An error that will not be retried */
export class NonRetryableError extends Error {
  /** @type {Error} */
  #inner = null;

  get inner() {
    return this.#inner;
  }

  constructor(inner) {
    super();
    this.#inner = inner;
  }
}

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
        if (error instanceof NonRetryableError) throw error.inner;
        if (retryCount >= retryLimit) throw error;
        retryCount++;

        const multiplier = Math.random() * 0.15 + 1;
        await wait(timeout * retryCount * multiplier);
        await onerror(error, retryCount);
      }
    }
  };
}
