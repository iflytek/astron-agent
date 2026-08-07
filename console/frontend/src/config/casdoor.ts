// Casdoor 配置与 SDK 初始化
import Sdk from 'casdoor-js-sdk';

const getRuntimeCasdoorUrl = (): string => {
  try {
    console.log(
      'casdoor url',
      window?.__APP_CONFIG__,
      'CONSOLE_CASDOOR_URL',
      import.meta?.env?.CONSOLE_CASDOOR_URL,
      'VITE_CASDOOR_SERVER_URL',
      import.meta?.env?.VITE_CASDOOR_SERVER_URL
    );
  } catch (error) {
    console.log('casdoor url error', error);
  }
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    const runtimeValue = window.__APP_CONFIG__.CASDOOR_URL;
    if (runtimeValue !== undefined) {
      return runtimeValue;
    }
  }
  const envUrl = import.meta.env.CONSOLE_CASDOOR_URL;
  const fallbackUrl = import.meta.env.VITE_CASDOOR_SERVER_URL;
  return (
    (envUrl !== undefined ? envUrl : fallbackUrl) || 'http://localhost:3000'
  );
};

const getRuntimeCasdoorClientId = (): string => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    const runtimeValue = window.__APP_CONFIG__.CASDOOR_ID;
    if (runtimeValue !== undefined) {
      return runtimeValue;
    }
  }
  const envValue = import.meta.env.CONSOLE_CASDOOR_ID;
  const fallbackValue = import.meta.env.VITE_CASDOOR_CLIENT_ID;
  return (envValue !== undefined ? envValue : fallbackValue) || '';
};

const getRuntimeCasdoorAppName = (): string => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    const runtimeValue = window.__APP_CONFIG__.CASDOOR_APP;
    if (runtimeValue !== undefined) {
      return runtimeValue;
    }
  }
  const envValue = import.meta.env.CONSOLE_CASDOOR_APP;
  const fallbackValue = import.meta.env.VITE_CASDOOR_APP_NAME;
  return (envValue !== undefined ? envValue : fallbackValue) || '';
};

const getRuntimeCasdoorOrgName = (): string => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    const runtimeValue = window.__APP_CONFIG__.CASDOOR_ORG;
    if (runtimeValue !== undefined) {
      return runtimeValue;
    }
  }
  const envValue = import.meta.env.CONSOLE_CASDOOR_ORG;
  const fallbackValue = import.meta.env.VITE_CASDOOR_ORG_NAME;
  return (envValue !== undefined ? envValue : fallbackValue) || '';
};

export const casdoorSdk = new Sdk({
  serverUrl: getRuntimeCasdoorUrl(),
  clientId: getRuntimeCasdoorClientId(),
  appName: getRuntimeCasdoorAppName(),
  organizationName: getRuntimeCasdoorOrgName(),
  redirectPath: '/callback',
  signinPath: '/api/signin',
});

export const saveTokenFromResponse = (res: unknown): void => {
  try {
    const r = res as Record<string, unknown>;
    const data = (r?.data as Record<string, unknown>) || r;
    const token = (data as { accessToken?: string }).accessToken;
    if (token) {
      localStorage.setItem('accessToken', token);
    }
    const refreshToken = (data as { refreshToken?: string }).refreshToken;
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  } catch {
    // ignore
  }
};

export const isGetTokenSuccessful = (res: unknown): boolean => {
  if (!res) return false;
  const r = res as Record<string, unknown>;
  if (r?.success === true) return true;
  if (r?.code === 0) return true;
  const data = (r?.data as Record<string, unknown>) || r;
  if ((data as Record<string, unknown>)?.accessToken) return true;
  return Boolean((r as Record<string, unknown>)?.accessToken);
};

// ======= PKCE/前端直连辅助方法 =======
export const getLogoutUrl = (postLogoutRedirect?: string): string => {
  const server = getRuntimeCasdoorUrl() || '';
  const clientId = getRuntimeCasdoorClientId();
  const redirect = postLogoutRedirect || window.location.origin;
  const url = new URL(`${server.replace(/\/$/, '')}/logout`);
  if (clientId) url.searchParams.set('clientId', clientId);
  url.searchParams.set('post_logout_redirect_uri', redirect);
  return url.toString();
};

export const performLogout = (postLogoutRedirect?: string): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // 可选：清理可能的临时登录状态
  try {
    sessionStorage.removeItem('postLoginRedirect');
  } catch {
    //
  }
  // 返回首页
  window.location.href = '/home';
};

export interface ParsedUserInfo {
  nickname?: string;
  login?: string;
  avatar?: string;
  uid?: string;
}

export const parseCurrentUserFromToken = (): ParsedUserInfo | undefined => {
  const token = localStorage.getItem('accessToken');
  if (!token) return undefined;
  try {
    const result = casdoorSdk.parseAccessToken(token) as unknown as {
      header: Record<string, unknown>;
      payload: Record<string, unknown> & {
        name?: string;
        preferred_username?: string;
        displayName?: string;
        avatar?: string;
        sub?: string;
        email?: string;
      };
    };
    const p = result?.payload || {};
    return {
      nickname:
        (p.displayName as string) ||
        (p.name as string) ||
        (p.preferred_username as string) ||
        (p.email as string),
      login: (p.name as string) || (p.preferred_username as string),
      avatar: (p.avatar as string) || undefined,
      uid: (p.sub as string) || undefined,
    };
  } catch {
    return undefined;
  }
};
