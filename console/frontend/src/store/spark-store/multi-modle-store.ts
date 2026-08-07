import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** 虚拟人项接口 */
export interface AvatarItem {
  [key: string]: unknown;
}

/** 背景图片项接口 */
export interface BackgroundItem {
  [key: string]: unknown;
}

/** 背景音乐项接口 */
export interface BgmItem {
  [key: string]: unknown;
}

/** 发音人项接口 */
export interface SpeakerItem {
  [key: string]: unknown;
}

// 定义Zustand store接口
export interface MultiModleState {
  // 虚拟人列表
  avaList: AvatarItem[];
  setAvaList: (list: AvatarItem[]) => void;

  // 背景图片列表
  backgroundList: BackgroundItem[];
  setBackgroundList: (list: BackgroundItem[]) => void;

  // 背景音列表
  bgmList: BgmItem[];
  setBgmList: (list: BgmItem[]) => void;

  // 发音人列表
  speakList: SpeakerItem[];
  setSpeakList: (list: SpeakerItem[]) => void;
}

// 创建Zustand store
export const useMultiModleStore = create<MultiModleState>()(
  persist(
    set => ({
      // 虚拟人列表
      avaList: [],
      setAvaList: (list: AvatarItem[]): void => {
        set({ avaList: list });
      },

      // 背景图片列表
      backgroundList: [],
      setBackgroundList: (list: BackgroundItem[]): void => {
        set({ backgroundList: list });
      },

      // 背景音列表
      bgmList: [],
      setBgmList: (list: BgmItem[]): void => {
        set({ bgmList: list });
      },

      // 发音人列表
      speakList: [],
      setSpeakList: (list: SpeakerItem[]): void => {
        set({ speakList: list });
      },
    }),
    {
      name: 'multi-modle-storage', // 本地存储键名
      storage: createJSONStorage(() => localStorage), // 使用localStorage
    }
  )
);
