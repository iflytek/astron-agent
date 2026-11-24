import { create } from 'zustand';
import { getUserInfoMe } from '@/services/login';
import useSpaceStore from './space-store';
import { SpaceType, RoleType, EnterpriseServiceType } from '@/types/permission';

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
  enterpriseId?: string;
  enterpriseServiceType?: EnterpriseServiceType;
  [key: string]: unknown;
}

export interface UserState {
  user: User;
  getUserInfo: () => Promise<void>;
  resetUser: () => void;
  clearUserRole: () => void;
  setUserRole: (
    _spaceType: SpaceType,
    _roleType: RoleType,
    _spaceId?: string,
    _enterpriseId?: string
  ) => void;
  getUserRole: () => {
    spaceType: SpaceType;
    roleType: RoleType;
    spaceId?: string | undefined;
    userId?: string | undefined;
  } | null;
  setMobile: (_mobile: string) => void;
  getIsLogin: () => boolean;
}

let profileRequest = 0;

const useUserStore = create<UserState>((set, get) => ({
  // 初始状态
  user: {} as User,
  getIsLogin: () => {
    const hasUser = !!get()?.user?.uid;
    return hasUser;
  },
  // 操作方法
  getUserInfo: async (): Promise<void> => {
    const request = ++profileRequest;
    try {
      const userData = await getUserInfoMe();
      if (request !== profileRequest) return;
      set(state => ({
        user: {
          ...userData,
          // A profile refresh must not erase the role loaded for this account.
          ...(state.user.uid === userData.uid
            ? {
                spaceType: state.user.spaceType,
                roleType: state.user.roleType,
                spaceId: state.user.spaceId,
                enterpriseId: state.user.enterpriseId,
              }
            : {}),
        },
      }));
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  },
  resetUser: (): void => {
    profileRequest += 1;
    set({ user: {} as User });
  },
  clearUserRole: (): void => {
    set(state => ({
      user: {
        ...state.user,
        spaceType: undefined,
        roleType: undefined,
        spaceId: undefined,
        enterpriseId: undefined,
      },
    }));
  },
  setUserRole: (
    _spaceType: SpaceType,
    _roleType: RoleType,
    _spaceId?: string,
    _enterpriseId?: string
  ): void => {
    if (!get().user.uid) return;
    set((state: UserState) => ({
      user: {
        ...state.user,
        spaceType: _spaceType,
        roleType: _roleType,
        spaceId: _spaceId,
        enterpriseId: _enterpriseId,
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
    const selected = useSpaceStore.getState();
    if (
      !user.uid ||
      !user.spaceType ||
      !user.roleType ||
      (user.spaceId || '') !== selected.spaceId ||
      (user.enterpriseId || '') !== selected.enterpriseId
    ) {
      return null;
    }
    return {
      spaceType: user.spaceType,
      roleType: user.roleType,
      spaceId: user.spaceId,
      userId: user.uid,
    };
  },
  setMobile: (_mobile: string): void => {
    set({ user: { ...get().user, mobile: _mobile } });
  },
}));

export default useUserStore;
