import { create } from 'zustand';

/** 助手详细信息接口 */
export interface BotDetailInfo {
  [key: string]: unknown;
}

/** 语音配置接口 */
export interface BotVcnConfig {
  cn: string;
  en: string;
  speed: string;
  isDialect: boolean;
}

// 定义Bot状态接口
export interface BotState {
  // 助手详细信息
  botDetailInfo: BotDetailInfo | null;
  setBotDetailInfo: (info: BotDetailInfo | null) => void;

  // 语音配置
  botVcn: BotVcnConfig;
  setBotVcn: (vcn: BotVcnConfig) => void;
}

// 创建Zustand store
export const useBotStateStore = create<BotState>()(set => ({
  // 初始化状态
  botDetailInfo: null,
  botVcn: {
    cn: '',
    en: '',
    speed: '',
    isDialect: false,
  },

  // 设置方法
  setBotDetailInfo: (info: BotDetailInfo | null): void =>
    set({ botDetailInfo: info }),
  setBotVcn: (vcn: BotVcnConfig): void => set({ botVcn: vcn }),
}));
