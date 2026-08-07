import { Suspense, useCallback, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from 'react-router-dom';
import { Spin, message } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

import EnterpriseSpaceLayout from './base-layout';
import SpaceManage from './page-components/space-manage';
import MemberManage from './page-components/member-manage';
import TeamSettings from './page-components/team-settings';

import { getEnterpriseDetail } from '@/services/enterprise';

import useUserStore from '@/store/user-store';
import useSpaceStore from '@/store/space-store';
import useEnterpriseStore from '@/store/enterprise-store';
import { useSpaceType } from '@/hooks/use-space-type';

import { defaultEnterpriseAvatar, roleToRoleType } from '@/pages/space/config';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';
import { RoleType, SpaceType, EnterpriseServiceType } from '@/types/permission';

export default function Index() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enterpriseId } = useParams();
  const { setUserRole, user } = useUserStore();
  const { setEnterpriseId, setSpaceStore } = useSpaceStore();
  const { certificationType, setEnterpriseInfo, clearEnterpriseData } =
    useEnterpriseStore();
  const { switchToPersonal, isTeamSpace, handleTeamSwitch } =
    useSpaceType(navigate);
  const { roleTextMap } = useSpaceI18n();

  // 检查用户权限 - 个人版用户不能访问企业空间
  useEffect(() => {
    if (user?.enterpriseServiceType === EnterpriseServiceType.NONE) {
      console.warn('个人版用户无权访问企业空间，正在重定向...');

      // 清空企业相关数据
      clearEnterpriseData();

      // 清空 sessionStorage 中的企业空间数据
      try {
        const storageKey = 'space-storage';
        const storageData = sessionStorage.getItem(storageKey);
        if (storageData) {
          const parsedData = JSON.parse(storageData);
          if (parsedData?.state) {
            parsedData.state.enterpriseId = '';
            parsedData.state.enterpriseName = '';
            parsedData.state.spaceType = 'personal';
            sessionStorage.setItem(storageKey, JSON.stringify(parsedData));
          }
        }
      } catch (error) {
        console.error('清空 sessionStorage 失败:', error);
      }

      // 切换到个人空间并重定向
      switchToPersonal({ isJump: true });

      message.warning(t('space.personalVersionNoAccess'));
      return;
    }
  }, [user?.enterpriseServiceType, clearEnterpriseData, switchToPersonal, t]);
  // 初始化获取团队信息
  const getEnterpriseDetailFn = useCallback(async () => {
    // 个人版用户不执行企业信息获取
    if (user?.enterpriseServiceType === EnterpriseServiceType.NONE) {
      return;
    }

    if (certificationType) {
      return;
    }
    if (!enterpriseId) {
      switchToPersonal();
    }

    if (!isTeamSpace()) {
      setSpaceStore({
        spaceType: 'team',
        enterpriseId,
      });

      handleTeamSwitch(enterpriseId, { isJump: false });
    }

    try {
      const res: any = await getEnterpriseDetail();
      console.log(res, '=========== getEnterpriseDetail ============');

      if (res?.detail?.flag === false) {
        message.error(res?.detail?.desc);
        // todo

        return;
      }

      setUserRole(
        SpaceType.ENTERPRISE,
        roleToRoleType(res?.role, true) as RoleType
      );
      console.log(
        roleToRoleType(res?.role, true),
        '=========== roleToRoleType ============'
      );

      const enterpriseDetail = {
        ...res,
        avatarUrl: res?.avatarUrl || defaultEnterpriseAvatar,
        roleTypeText:
          roleTextMap[
            roleToRoleType(res?.role, true) as keyof typeof roleTextMap
          ],
      };
      setEnterpriseInfo(enterpriseDetail);
    } catch (err: any) {
      message.error(err?.msg || err?.desc);
    }
  }, [
    user?.enterpriseServiceType,
    certificationType,
    enterpriseId,
    isTeamSpace,
    setSpaceStore,
    handleTeamSwitch,
    setUserRole,
    roleTextMap,
    setEnterpriseInfo,
    switchToPersonal,
  ]);

  useEffect(() => {
    getEnterpriseDetailFn();
  }, [getEnterpriseDetailFn]);

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
