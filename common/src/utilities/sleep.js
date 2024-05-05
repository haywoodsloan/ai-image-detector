/**
 * @param {number} delay
 */
export async function wait(delay) {
  await new Promise((res) => setTimeout(res, delay));
}
