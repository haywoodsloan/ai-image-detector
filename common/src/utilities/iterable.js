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

/**
 * @template T
 * @param {Iterable<T>} values
 * @description If the provided iterable is already
 * an array is will be shuffled in place
 */
export function shuffle(values) {
  const array = Array.isArray(values) ? values : [...values];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
