export const errorText = (error: unknown): string =>
  error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : '操作失败，请重试';
