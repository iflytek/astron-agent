/**
 * Business errors are already displayed by the shared HTTP interceptor.
 * Its transport/authentication errors (100/101) and local errors still need
 * to be displayed by the caller.
 */
export const shouldShowRequestError = (value: unknown): boolean => {
  const code =
    value && typeof value === 'object' && 'code' in value
      ? value.code
      : undefined;
  return (
    typeof code !== 'number' ||
    !Number.isFinite(code) ||
    code === 100 ||
    code === 101
  );
};
