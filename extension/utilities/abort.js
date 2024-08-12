/**
 *
 * @param  {...AbortSignal} signals
 */
export function mergeSignals(...signals) {
  if (signals.some((signal) => signal.aborted)) return AbortSignal.abort();

  const controller = new AbortController();
  const listener = () => {
    for (const signal of signals) signal.removeEventListener('abort', listener);
    controller.abort();
  };

  for (const signal of signals) signal.addEventListener('abort', listener);
  return controller.signal;
}
