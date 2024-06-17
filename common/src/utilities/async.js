/**
 * @template T, V
 * @param {AsyncGenerator<T> | T[]} iterable
 * @param {(val: T) => Promise<V?>} check
 */
export async function firstResult(iterable, check) {
  /** @type {Set<Promise<boolean>} */
  const parallels = new Set();

  /**@type {V} */
  let firstVal;

  // Start a parallel check for each item in iterable
  for await (const item of iterable) {
    // If already passed return early
    if (typeof firstVal !== 'undefined' && firstVal !== null) return firstVal;

    // Add a parallel check
    const parallel = check(item)
      .then((result) => (firstVal ||= result))
      .finally(() => parallels.delete(parallel));
    parallels.add(parallel);
  }

  // Wait for a promise to finish until all parallels are done
  while (parallels.size) {
    await Promise.any([...parallels]);
    if (typeof firstVal !== 'undefined' && firstVal !== null) return firstVal;
  }

  return firstVal;
}
