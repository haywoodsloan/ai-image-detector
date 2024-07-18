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
