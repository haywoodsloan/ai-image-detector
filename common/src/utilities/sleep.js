/**
 * @param {number} delay
 * @param {AbortSignal} signal
 */
export async function wait(delay, signal = null) {
  await new Promise((res, rej) => {
    if (signal?.aborted) {
      rej(signal.reason);
      return;
    }

    const timeout = setTimeout(res, delay);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      rej(signal.reason);
    });
  });
}
