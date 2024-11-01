/**
 * @param {number | TimeSpan} delay
 * @param {AbortSignal} signal
 */
export async function wait(delay, signal = null) {
  if (!delay) return;
  await new Promise((res, rej) => {
    // Make sure the signal isn't already aborted
    if (signal?.aborted) {
      rej(signal.reason);
      return;
    }

    // Start a timeout, reject if the signal gets aborted
    const timeout = setTimeout(res, delay);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      rej(signal.reason);
    });
  });
}
