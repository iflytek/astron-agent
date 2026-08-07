import { create } from 'zustand';

export interface EnterpriseInfo {
  id: string;
  logoUrl?: string;
  avatarUrl: string;
  name: string;
  role: number;
  roleTypeText: string;
  officerName: string;
  orgId: string;
  serviceType: number;
  uid: string;
  createTime: string;
  updateTime: string;
  expireTime: string;
}

export interface SpaceStatistics {
  total: number; // 所有的
  joined: number; // 加入的
}

export interface EnterpriseStore {
  info: EnterpriseInfo;
  spaceStatistics: SpaceStatistics;
  joinedEnterpriseList: EnterpriseInfo[];
  certificationType: null | boolean;
  setEnterpriseInfo: (enterprise: Partial<EnterpriseInfo>) => void;
  setJoinedEnterpriseList: (list: EnterpriseInfo[]) => void;
  setSpaceStatistics: (statistics: SpaceStatistics) => void;
  setCertificationType: (type: boolean) => void;
  clearEnterpriseData: () => void;
}

const getDefaultEnterpriseInfo = () => ({
  id: '',
  logoUrl: '',
  avatarUrl: '',
  name: '',
  role: 0,
  roleTypeText: '',
  officerName: '',
  orgId: '',
  serviceType: 1,
  uid: '',
  createTime: '',
  updateTime: '',
  expireTime: '',
});

const useEnterpriseStore = create<EnterpriseStore>((set, get) => ({
  // 初始状态
  info: getDefaultEnterpriseInfo(),
  certificationType: null,
  joinedEnterpriseList: [],
  spaceStatistics: {
    total: 0,
    joined: 0,
  },
  setEnterpriseInfo: (enterprise: Partial<EnterpriseInfo>) => {
    set({ info: { ...get().info, ...enterprise } });
  },
  setJoinedEnterpriseList: (list: EnterpriseInfo[]) => {
    set({ joinedEnterpriseList: list });
  },
  setSpaceStatistics: (statistics: SpaceStatistics) => {
    set({ spaceStatistics: statistics });
  },
  setCertificationType: (type: boolean) => {
    set({ certificationType: type });
  },
  clearEnterpriseData: () => {
    set({
      info: getDefaultEnterpriseInfo(),
      certificationType: null,
      joinedEnterpriseList: [],
      spaceStatistics: {
        total: 0,
        joined: 0,
      },
    });
  },
}));

export default useEnterpriseStore;
