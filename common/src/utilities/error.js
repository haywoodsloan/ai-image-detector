import { HubApiError } from '@huggingface/hub';

export class ApiError extends Error {
  /** @type {number} */ status;

  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {HubApiError | AggregateError | ApiError} error
 * @returns {boolean}
 */
export function isRateLimitError(error) {
  if (error instanceof HubApiError && error.statusCode === 429) return true;
  else if (error instanceof ApiError && error.status === 429) return true;
  else if (!(error instanceof AggregateError)) return false;
  return error.errors.some((nested) => isRateLimitError(nested));
}

/**
 * @param {AggregateError} error
 * @returns {any[]}
 */
export function flattenAggregateError(error) {
  return error.errors.flatMap((e) =>
    e instanceof AggregateError ? flattenAggregateError(e) : e
  );
}
