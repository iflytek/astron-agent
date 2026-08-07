import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { casdoorSdk } from '@/config';

const CallbackPage = (): ReactElement => {
  useEffect(() => {
    const handleExchange = async (): Promise<void> => {
      try {
        const resp = (await casdoorSdk.exchangeForAccessToken()) as {
          access_token?: string;
          refresh_token?: string;
        };
        const accessToken = resp?.access_token;
        const refreshToken = resp?.refresh_token;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
      } catch {
        // 失败也跳回主页或来源页，由上层决定后续处理
      } finally {
        const redirect = sessionStorage.getItem('postLoginRedirect') || '/';
        sessionStorage.removeItem('postLoginRedirect');
        window.location.replace(redirect);
      }
    };
    handleExchange();
  }, []);

  return <></>;
};

export default CallbackPage;
