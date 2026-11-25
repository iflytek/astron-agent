import { isCancel } from 'axios';

/**
 * Business and HTTP response errors are displayed by the shared interceptor.
 * Cancellation and login redirects need no toast. Network and local errors
 * still need to be displayed by the caller.
 */
export const shouldShowRequestError = (value: unknown): boolean => {
  if (isCancel(value)) return false;
  const code =
    value && typeof value === 'object' && 'code' in value
      ? value.code
      : undefined;
  return typeof code !== 'number' || !Number.isFinite(code) || code === 100;
};
