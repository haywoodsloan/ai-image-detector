/**
 * @template T
 * @param {Iterable<T>} values
 * @param {number} limit
 */
export function* take(values, limit) {
  let count = 0;
  for (const value of values) {
    yield value;
    if (count++ >= limit - 1) return;
  }
}

/**
 * @template T
 * @param {Iterable<T>} values
 * @param {(value: T) => any} selector
 */
export function* unique(values, selector) {
  const set = new Set();
  for (const value of values) {
    if (typeof value === 'undefined') continue;

    const key = selector(value);
    if (!set.has(key)) yield value;

    set.add(key);
  }
}
