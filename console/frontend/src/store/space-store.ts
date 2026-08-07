import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SpaceStore {
  isShowSpacePopover: boolean;
  spaceName: string;
  spaceId: string;
  enterpriseId: string;
  enterpriseName: string;
  spaceType: string;
  spaceAvatar: string;
}

interface SpaceActions {
  setIsShowSpacePopover: (isShowSpacePopover: boolean) => void;
  setSpaceName: (spaceName: string) => void;
  setSpaceId: (spaceId: string) => void;
  setSpaceType: (spaceType: string) => void;
  setEnterpriseId: (enterpriseId: string) => void;
  setEnterpriseName: (enterpriseName: string) => void;
  setSpaceStore: (spaceStore: Partial<SpaceStore>) => void;
  setSpaceAvatar: (spaceAvatar: string) => void;
}

const useSpaceStore = create<SpaceStore & SpaceActions>()(
  persist(
    set => ({
      isShowSpacePopover: false,
      spaceName: '',
      spaceId: '',
      enterpriseId: '',
      enterpriseName: '',
      spaceType: 'personal',
      spaceAvatar: '',
      setIsShowSpacePopover: (isShowSpacePopover: boolean): void => {
        set({ isShowSpacePopover });
      },
      setSpaceName: (spaceName: string): void => {
        set({ spaceName });
      },
      setSpaceId: (spaceId: string): void => {
        set({ spaceId });
      },
      setEnterpriseId: (enterpriseId: string): void => {
        set({ enterpriseId });
      },
      setEnterpriseName: (enterpriseName: string): void => {
        set({ enterpriseName });
      },
      setSpaceType: (spaceType: string): void => {
        set({ spaceType });
      },
      setSpaceStore: (spaceStore: Partial<SpaceStore>): void => {
        set({ ...spaceStore });
      },
      setSpaceAvatar: (spaceAvatar: string): void => {
        set({ spaceAvatar });
      },
    }),
    {
      name: 'space-storage',
      storage: createJSONStorage(() => sessionStorage), // 关键配置
      partialize: state => ({
        spaceId: state.spaceId,
        spaceName: state.spaceName,
        enterpriseId: `${state.enterpriseId || ''}`,
        spaceType: state.spaceType,
        spaceAvatar: state.spaceAvatar,
      }),
    }
  )
);

export default useSpaceStore;
