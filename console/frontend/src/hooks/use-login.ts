import { useCallback, useState } from 'react';
import http from '@/utils/http';

interface LoginState {
  loading: boolean;
  error: string | null;
}

interface TokenStorage {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearTokens: () => void;
  isAccessTokenExpired: () => boolean;
  isRefreshTokenExpired: () => boolean;
}

// 简化的 token 存储管理
export const tokenStorage: TokenStorage = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),

  setTokens: tokens => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  },

  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  isAccessTokenExpired: () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return true;

    try {
      const payload = JSON.parse(window.atob(token.split('.')[1] || ''));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  },

  isRefreshTokenExpired: () => {
    const token = localStorage.getItem('refreshToken');
    if (!token) return true;

    try {
      const payload = JSON.parse(window.atob(token.split('.')[1] || ''));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  },
};

const useLogin = (): {
  loading: boolean;
  error: string | null;
  refreshToken: () => Promise<boolean>;
  tokenStorage: TokenStorage;
} => {
  const [state, setState] = useState<LoginState>({
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean): void => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null): void => {
    setState(prev => ({ ...prev, error }));
  };

  // 刷新 token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refreshTokenValue = tokenStorage.getRefreshToken();

    if (!refreshTokenValue || tokenStorage.isRefreshTokenExpired()) {
      tokenStorage.clearTokens();
      return false;
    }

    try {
      const response = await http.post('/api/auth/refresh', {
        refreshToken: refreshTokenValue,
      });

      if (response.data?.accessToken && response.data?.refreshToken) {
        tokenStorage.setTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        });
        return true;
      }

      tokenStorage.clearTokens();
      return false;
    } catch {
      tokenStorage.clearTokens();
      return false;
    }
  }, []);

  return {
    ...state,
    refreshToken,
    tokenStorage,
  };
};

export default useLogin;
