/**
 * @param {InvocationContext} context
 */
export function captureConsole(context) {
  console.log = (...args) => context.log(...args);
  console.warn = (...args) => context.warn(...args);
  console.error = (...args) => context.error(...args);
}
