import { useEffect, type ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from '@/router';
import useUserStore from '@/store/user-store';
import i18n from './i18n';

export default function App(): ReactElement {
  useEffect(() => {
    document.documentElement.lang = i18n.language || 'zh';
    const pathname = window.location.pathname.replace(/\/+$/, '');
    if (
      !['/login', '/register', '/reset-password', '/account'].includes(pathname)
    ) {
      void useUserStore.getState().getUserInfo();
    }
  }, []);
  return <RouterProvider router={router} />;
}
