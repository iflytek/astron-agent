import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from '@/router';
import useUserStore, { UserState } from '@/store/user-store';
import { useEnterprise } from './hooks/use-enterprise';
import { useSpaceType } from './hooks/use-space-type';
import i18n from './i18n';

export default function App(): ReactElement {
  const getUserInfo = useUserStore((state: UserState) => state.getUserInfo);
  const { getJoinedEnterpriseList, getEnterpriseSpaceCount, visitEnterprise } =
    useEnterprise();
  const { getLastVisitSpace, enterpriseId, switchToPersonal, isTeamSpace } =
    useSpaceType();
  const [initDone, setInitDone] = useState<boolean>(false);

  const initSpaceInfo = useCallback(async () => {
    try {
      const pathname = window.location.pathname.replace(/\/+$/, '');
      if (pathname === '/space' && isTeamSpace()) {
        switchToPersonal({ isJump: false });
        return;
      }

      if (!sessionStorage.getItem('lastVisitSpaceDone')) {
        await getLastVisitSpace();
        sessionStorage.setItem('lastVisitSpaceDone', 'true');
      }
    } finally {
      setInitDone(true);
    }
  }, [getLastVisitSpace, isTeamSpace, switchToPersonal]);

  useEffect(() => {
    const language = i18n.language || 'zh';
    // 设置根元素类名及lang
    document.documentElement.lang = language;
    document.documentElement.classList.forEach(className => {
      if (className.startsWith('')) {
        document.documentElement.classList.remove(className);
      }
    });
    document.documentElement.classList.add(`lang-${language}`);
  }, [i18n.language]);

  useEffect(() => {
    const pathname = window.location.pathname.replace(/\/+$/, '');
    if (pathname === '/callback') return; // 避免在回调页时发起鉴权相关请求
    getUserInfo();
    initSpaceInfo();
    getEnterpriseSpaceCount();
    getJoinedEnterpriseList();
  }, []);

  useEffect(() => {
    if (!initDone) return;
    getEnterpriseSpaceCount();
    visitEnterprise(enterpriseId);
  }, [enterpriseId, initDone]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}
