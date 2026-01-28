import useSpaceStore, { SpaceStore } from '@/store/space-store';
import {
  createPersonalSpace,
  updatePersonalSpace,
  deletePersonalSpace,
  createCorporateSpace,
  updateCorporateSpace,
  deleteCorporateSpace,
  checkSpaceName,
  deleteSpaceSendCode,
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
  mobile: string;
  verifyCode: string;
}

export const useSpaceType = (navigate?: any) => {
  const {
    spaceType,
    spaceId,
    enterpriseId,
    setEnterpriseId,
    setSpaceStore,
    setSpaceAvatar,
  } = useSpaceStore();

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

  // 空间操作方法
  const createSpace = useCallback(
    async (params: any) => {
      if (isPersonalSpace()) {
        return createPersonalSpace(params);
      }
      return createCorporateSpace(params);
    },
    [isPersonalSpace]
  );

  const editSpace = useCallback(
    async (params: any) => {
      // 编辑空间复用创建接口，需要传入spaceId
      const editParams = {
        ...params,
      };
      if (isPersonalSpace()) {
        return updatePersonalSpace(editParams);
      }
      return updateCorporateSpace(editParams);
    },
    [isPersonalSpace]
  );

  const sendCodeForDelete = useCallback(async () => {
    return deleteSpaceSendCode({
      spaceId,
    });
  }, [spaceId]);

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
        window.location.href = '/space/agent';
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
        switchToPersonal();
      }

      const resetTeamPath = (hasSpace: boolean) => {
        if (param?.isJump) {
          if (hasSpace) {
            navigate?.('/space/agent');
          } else {
            navigate?.('/home');
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
        const currentEnterpriseId = _enterpriseId || enterpriseId;
        if (_enterpriseId) {
          setSpaceStore({
            spaceType: 'team',
            enterpriseId: _enterpriseId,
          });
        }
        console.log(
          _enterpriseId,
          '-------------- _enterpriseId --------------'
        );
        // 获取最近访问空间
        const spaceData: any = await getLastVisitSpace();
        // 检查是否有有效的最近访问空间
        if (
          spaceData?.id &&
          Number(spaceData.enterpriseId) === Number(currentEnterpriseId)
        ) {
          const spaceState: Partial<SpaceStoreState> = {
            spaceId: spaceData.id,
            spaceName: spaceData.name,
            spaceType: 'team',
            spaceAvatar: spaceData.avatarUrl,
            enterpriseId: spaceData.enterpriseId,
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
          spaceId: defaultSpace.id,
          spaceName: defaultSpace.name,
          spaceType: 'team',
          spaceAvatar: defaultSpace.avatarUrl,
        };
        setSpaceStore(spaceState);
        visitSpace(defaultSpace.id);
        resetTeamPath(true);
      } catch (error) {
        console.error('切换团队空间失败:', error);
        resetSpaceStore();
      }
    },
    [enterpriseId, setEnterpriseId, setSpaceStore]
  );

  const deleteSpaceCb = useCallback(async () => {
    if (!isTeamSpace()) {
      getLastVisitSpaceInfo();
      navigate?.('/space/agent');
      return;
    }

    handleTeamSwitch(enterpriseId);
  }, [isTeamSpace, navigate, handleTeamSwitch, enterpriseId]);

  const checkName = useCallback(
    async (params: { name: string; id?: string }) => {
      return checkSpaceName(params);
    },
    []
  );

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
            window.location.href = '/home';
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
      createSpace,
      editSpace,
      sendCodeForDelete,
      deleteSpace,
      deleteSpaceCb,
      checkName,
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
      createSpace,
      editSpace,
      sendCodeForDelete,
      deleteSpace,
      deleteSpaceCb,
      checkName,
      handleTeamSwitch,
      getLastVisitSpaceInfo,
      goToSpaceManagement,
      switchToPersonal,
    ]
  );

  return returnValues;
};
