const API_BASE = '/console-api';

export const getCsrfToken = (): string =>
  document.cookie
    .split('; ')
    .find(item => item.startsWith('astron_csrf='))
    ?.slice('astron_csrf='.length) || '';

let csrfRequest: Promise<string> | undefined;

export const ensureCsrfToken = async (): Promise<string> => {
  const existing = getCsrfToken();
  if (existing) return existing;
  if (!csrfRequest) {
    csrfRequest = fetch(`${API_BASE}/auth/csrf`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async response => {
        if (!response.ok) throw new Error('无法建立安全连接，请稍后重试');
        const result = await response.json();
        return result.data.csrfToken as string;
      })
      .finally(() => {
        csrfRequest = undefined;
      });
  }
  return csrfRequest;
};

export class AccountRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export const accountRequest = async <T>(
  path: string,
  payload?: Record<string, unknown>
): Promise<T> => {
  const headers: Record<string, string> = {};
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRFToken'] = await ensureCsrfToken();
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: payload === undefined ? 'GET' : 'POST',
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
  });
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new AccountRequestError(
      result.message || '操作失败，请稍后重试',
      response.status
    );
  }
  return result.data as T;
};
