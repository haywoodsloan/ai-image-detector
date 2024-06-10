/**
 * @param {number} status
 * @param {string | Error} error
 * @returns {HttpResponseInit}
 */
export function createErrorResponse(status, error) {
  error = error instanceof Error ? error.message : error;
  return { status, jsonBody: { error } };
}
