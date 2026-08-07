import { create } from 'zustand';
import { getUserInfoMe } from '@/services/login';
import { SpaceType, RoleType, EnterpriseServiceType } from '@/types/permission';
import { tokenStorage } from '@/hooks/use-login';

export interface User {
  id: number;
  uid: string;
  username: string;
  avatar: string;
  nickname: string;
  mobile: string;
  accountStatus: number;
  userAgreement: number;
  createTime: string;
  updateTime: string;
  deleted: number;
  spaceType?: SpaceType;
  roleType?: RoleType;
  spaceId?: string;
  enterpriseServiceType?: EnterpriseServiceType;
  [key: string]: unknown;
}

export interface UserState {
  user: User;
  isLogin: boolean;
  getUserInfo: () => void;
  setUserRole: (
    _spaceType: SpaceType,
    _roleType: RoleType,
    _spaceId?: string
  ) => void;
  getUserRole: () => {
    spaceType: SpaceType;
    roleType: RoleType;
    spaceId?: string | undefined;
    userId?: string | undefined;
  } | null;
  logOut: () => void;
  setMobile: (_mobile: string) => void;
  getIsLogin: () => boolean;
}

const useUserStore = create<UserState>((set, get) => ({
  // 初始状态
  user: {} as User,
  isLogin: !!get()?.user?.uid,
  getIsLogin: () => {
    const hasValidToken = !!tokenStorage.getAccessToken();
    const hasUser = !!get()?.user?.uid;
    return hasValidToken && hasUser;
  },
  // 操作方法
  getUserInfo: async (): Promise<void> => {
    try {
      const userData = await getUserInfoMe();
      set({ user: userData });
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  },
  setUserRole: (
    _spaceType: SpaceType,
    _roleType: RoleType,
    _spaceId?: string
  ): void => {
    set((state: UserState) => ({
      user: {
        ...state.user,
        spaceType: _spaceType,
        roleType: _roleType,
        spaceId: _spaceId,
      },
    }));
  },

  getUserRole: (): {
    spaceType: SpaceType;
    roleType: RoleType;
    spaceId?: string | undefined;
    userId?: string | undefined;
  } | null => {
    const { user } = get();
    if (!user.spaceType || !user.roleType) {
      return null;
    }
    return {
      spaceType: user.spaceType,
      roleType: user.roleType,
      spaceId: user.spaceId,
      userId: user.uid,
    };
  },
  logOut: (): void => {
    // 删除accessToken，refreshToken
    tokenStorage.clearTokens();
    set({ user: {} as User });
  },
  setMobile: (_mobile: string): void => {
    set({ user: { ...get().user, mobile: _mobile } });
  },
}));

export default useUserStore;
