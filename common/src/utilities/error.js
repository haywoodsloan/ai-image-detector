import { HubApiError } from '@huggingface/hub';

/**
 * @param {HubApiError | AggregateError} error
 * @returns {boolean}
 */
export function isRateLimitError(error) {
  if (error instanceof HubApiError && error.statusCode === 429) return true;
  if (!(error instanceof AggregateError)) return false;
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
