/**
 * @template T
 * @param {Iterator<T, never>} it
 * @param {number} limit
 */
export function* take(it, limit) {
  for (
    let val = it.next(), count = 0;
    !val.done && count < limit;
    val = it.next(), count++
  ) {
    yield val.value;
  }
}
