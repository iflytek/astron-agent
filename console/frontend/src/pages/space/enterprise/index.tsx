import { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Spin } from 'antd';
import classNames from 'classnames';
import styles from './index.module.scss';
import EnterpriseSpaceLayout from './base-layout';
import SpaceManage from './page-components/space-manage';
import MemberManage from './page-components/member-manage';
import TeamSettings from './page-components/team-settings';
import { getEnterpriseDetail } from '@/services/enterprise';
import useUserStore from '@/store/user-store';
import useSpaceStore from '@/store/space-store';
import useEnterpriseStore, {
  type EnterpriseInfo,
} from '@/store/enterprise-store';
import { defaultEnterpriseAvatar, roleToRoleType } from '@/pages/space/config';
import { RoleType, SpaceType } from '@/types/permission';

export default function Index() {
  const { enterpriseId } = useParams();
  const [loadedId, setLoadedId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let ignore = false;
    setError('');
    useSpaceStore.getState().setSpaceStore({
      enterpriseId: enterpriseId || '',
      spaceId: '',
      spaceName: '',
      spaceType: 'team',
    });
    getEnterpriseDetail()
      .then(result => {
        if (ignore) return;
        const detail = result as unknown as EnterpriseInfo;
        useUserStore
          .getState()
          .setUserRole(
            SpaceType.ENTERPRISE,
            roleToRoleType(detail.role, true) as RoleType
          );
        useEnterpriseStore.getState().setEnterpriseInfo({
          ...detail,
          avatarUrl: detail.avatarUrl || defaultEnterpriseAvatar,
          roleTypeText:
            detail.role === 1
              ? '所有者'
              : detail.role === 2
                ? '管理员'
                : '成员',
        });
        setLoadedId(enterpriseId || '');
      })
      .catch(() => {
        if (!ignore) setError('无法读取此团队，或您已没有访问权限。');
      });
    return () => {
      ignore = true;
    };
  }, [enterpriseId]);
  if (error) return <p role="alert">{error}</p>;
  if (loadedId !== enterpriseId) return <Spin />;
  return (
    <div
      className={classNames('h-full overflow-hidden', styles.enterpriseSpace)}
    >
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <Spin />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<EnterpriseSpaceLayout />}>
            <Route index element={<Navigate to="space" replace />} />
            <Route path="space" element={<SpaceManage />} />
            <Route path="member" element={<MemberManage />} />
            <Route path="team" element={<TeamSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}
