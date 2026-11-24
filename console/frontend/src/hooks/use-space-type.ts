import useSpaceStore, { SpaceStore } from '@/store/space-store';
import {
  deletePersonalSpace,
  deleteCorporateSpace,
  getLastVisitSpace,
  getJoinedCorporateList,
  visitSpace,
} from '@/services/space';
import { useCallback, useMemo } from 'react';

// 从spaceStore中引入类型
type SpaceStoreState = Pick<
  SpaceStore,
  'spaceId' | 'spaceName' | 'spaceType' | 'enterpriseId' | 'spaceAvatar'
>;

export const SPACE_TYPES = {
  PERSONAL: 'personal',
  TEAM: 'team',
} as const;

interface DeleteSpaceParams {
  spaceId: string;
}

export const useSpaceType = (navigate?: any) => {
  const { spaceType, spaceId, enterpriseId, setSpaceStore, setSpaceAvatar } =
    useSpaceStore();

  // 空间类型判断
  const isPersonalSpace = useCallback(
    () => spaceType === SPACE_TYPES.PERSONAL,
    [spaceType]
  );
  const isTeamSpace = useCallback(
    () => spaceType === SPACE_TYPES.TEAM,
    [spaceType]
  );
  // 默认的个人空间
  const isDefaultPersonalSpace = useCallback(
    () => !isTeamSpace() && !spaceId,
    [isTeamSpace, spaceId]
  );

  const deleteSpace = useCallback(
    async (params: DeleteSpaceParams) => {
      if (isPersonalSpace()) {
        return deletePersonalSpace(params);
      }
      return deleteCorporateSpace(params);
    },
    [isPersonalSpace]
  );

  // 切换到个人空间 配置参数 支持参数控制执行路由跳转
  const switchToPersonal = useCallback(
    (params: { isJump?: boolean; spaceId?: string } = { isJump: true }) => {
      setSpaceStore({
        spaceType: 'personal',
        spaceId: params?.spaceId || '',
        spaceName: '',
        enterpriseId: '',
        enterpriseName: '',
      });

      if (params?.isJump) {
        window.location.href = '/resource/knowledge';
      }
    },
    [setSpaceStore]
  );

  // 切换到企业团队 配置参数 支持参数控制执行路由跳转
  const handleTeamSwitch = useCallback(
    async (
      _enterpriseId?: string,
      param: { isJump: boolean } = { isJump: true }
    ) => {
      if (!(_enterpriseId || enterpriseId)) {
        return switchToPersonal(param);
      }

      const resetTeamPath = (hasSpace: boolean) => {
        if (param?.isJump) {
          if (hasSpace) {
            navigate?.('/resource/knowledge');
          } else {
            navigate?.(`/enterprise/${_enterpriseId || enterpriseId}/space`);
          }
        }
      };

      const resetSpaceStore = () => {
        const emptyState: Partial<SpaceStoreState> = {
          spaceId: '',
          spaceName: '',
          spaceAvatar: '',
          spaceType: 'team',
        };
        setSpaceStore(emptyState);
        resetTeamPath(false);
      };

      try {
        const currentEnterpriseId = String(_enterpriseId || enterpriseId);
        setSpaceStore({
          spaceId: '',
          spaceName: '',
          spaceAvatar: '',
          enterpriseName: '',
          spaceType: 'team',
          enterpriseId: currentEnterpriseId,
        });
        // 获取最近访问空间
        const spaceData: any = await getLastVisitSpace();
        // 检查是否有有效的最近访问空间
        if (
          spaceData?.id &&
          String(spaceData.enterpriseId) === currentEnterpriseId
        ) {
          const spaceState: Partial<SpaceStoreState> = {
            spaceId: String(spaceData.id),
            spaceName: spaceData.name,
            spaceType: 'team',
            spaceAvatar: spaceData.avatarUrl,
            enterpriseId: currentEnterpriseId,
          };
          setSpaceStore(spaceState);
          resetTeamPath(true);
          return;
        }

        // 获取所有加入的企业空间
        const joinedSpaces: any = await getJoinedCorporateList({
          enterpriseId: currentEnterpriseId,
        });

        if (!joinedSpaces?.length) {
          resetSpaceStore();
          return;
        }

        // 设置第一个空间为默认空间
        const defaultSpace = joinedSpaces[0];
        const spaceState: Partial<SpaceStoreState> = {
          spaceId: String(defaultSpace.id),
          spaceName: defaultSpace.name,
          spaceType: 'team',
          spaceAvatar: defaultSpace.avatarUrl,
        };
        setSpaceStore(spaceState);
        void visitSpace(defaultSpace.id).catch(() => undefined);
        resetTeamPath(true);
      } catch (error) {
        console.error('切换团队空间失败:', error);
        resetSpaceStore();
      }
    },
    [enterpriseId, navigate, setSpaceStore, switchToPersonal]
  );

  const deleteSpaceCb = useCallback(() => {
    if (!isTeamSpace()) {
      switchToPersonal({ isJump: false });
      navigate?.('/space');
      return;
    }

    setSpaceStore({ spaceId: '', spaceName: '', spaceAvatar: '' });
    navigate?.(`/enterprise/${enterpriseId}/space`);
  }, [isTeamSpace, navigate, switchToPersonal, setSpaceStore, enterpriseId]);

  const goToSpaceManagement = useCallback(() => {
    switch (spaceType) {
      case SPACE_TYPES.PERSONAL:
        navigate?.(`/space`);
        break;
      case SPACE_TYPES.TEAM:
        navigate?.(`/enterprise/${enterpriseId}/space`);
        break;
      default:
        console.warn('Unknown space type:', spaceType);
        break;
    }
  }, [spaceType, navigate, enterpriseId]);

  const getLastVisitSpaceInfo = useCallback(
    async (cb?: () => void) => {
      try {
        const spaceData: any = await getLastVisitSpace();
        const { id, enterpriseId, name, avatarUrl } = spaceData || {};

        if (!id) {
          if (!enterpriseId) {
            throw new Error('最近访问空间不存在');
          }

          if (!window.location.pathname.includes('/home')) {
            window.location.href = '/space';
            return;
          }

          handleTeamSwitch(enterpriseId);
          return;
        }

        setSpaceStore({
          spaceType: enterpriseId ? 'team' : 'personal',
          spaceId: id,
          spaceName: name,
          spaceAvatar: avatarUrl,
          enterpriseId: `${enterpriseId || ''}`,
        });
      } catch (error) {
        console.log('getLastVisitSpaceInfo error', error);
        setSpaceAvatar('');
        switchToPersonal({ isJump: false });
      } finally {
        cb?.();
      }
    },
    [setSpaceStore]
  );

  const returnValues = useMemo(
    () => ({
      // 当前空间类型
      spaceType,
      spaceId,
      // 企业id
      enterpriseId: `${enterpriseId || ''}`,
      // 类型判断
      isPersonalSpace,
      isTeamSpace,
      isDefaultPersonalSpace,
      // 空间操作
      deleteSpace,
      deleteSpaceCb,
      handleTeamSwitch,
      getLastVisitSpace: getLastVisitSpaceInfo,
      // 路由和状态
      goToSpaceManagement,
      switchToPersonal,
    }),
    [
      spaceType,
      spaceId,
      enterpriseId,
      isPersonalSpace,
      isTeamSpace,
      isDefaultPersonalSpace,
      deleteSpace,
      deleteSpaceCb,
      handleTeamSwitch,
      getLastVisitSpaceInfo,
      goToSpaceManagement,
      switchToPersonal,
    ]
  );

  return returnValues;
};
