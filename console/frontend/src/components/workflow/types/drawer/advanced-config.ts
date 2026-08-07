// Advanced Configuration 模块的类型定义

import { TFunction } from 'i18next';
import { VcnItem } from '@/components/speaker-modal';

// 聊天背景信息类型定义
export interface ChatBackgroundInfo {
  name: string;
  type: string;
  total: string;
  url: string;
}

// 高级配置结构类型定义
export interface AdvancedConfigType {
  needGuide?: boolean;
  prologue: {
    enabled: boolean;
    prologueText: string;
    inputExample: string[];
  };
  feedback: {
    enabled: boolean;
  };
  textToSpeech: {
    enabled: boolean;
    vcn_cn?: string;
  };
  suggestedQuestionsAfterAnswer: {
    enabled: boolean;
  };
  chatBackground: {
    enabled: boolean;
    info: ChatBackgroundInfo | null;
  };
}

// 上传响应类型定义
export interface UploadResponse {
  code: number;
  message: string;
  data: {
    downloadLink: string;
  };
}

export type UploadProps = Record<string, any>;

// 抽屉样式类型定义
export interface DrawerStyleType {
  height: number;
  top: number;
  right: number;
  zIndex: number;
}

// VoiceBroadcast 类型定义（基于使用方式推断）
export interface VoiceBroadcastInstance {
  closeWebsocketConnect(): void;
  establishConnect(content: string, param2: boolean, vcn?: string): void;
}

// 深度 Partial 类型定义
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 配置更新类型
export type AdvancedConfigUpdate = DeepPartial<AdvancedConfigType>;

// Component Props Types
export interface CommonComponentProps {
  advancedConfig: AdvancedConfigType;
  handleAdvancedConfigChange: (callback: () => void) => void;
  updateAdvancedConfigParams: (updateParams: AdvancedConfigUpdate) => void;
  vcnList: VcnItem[];
  t: TFunction;
}

export interface ConversationStarterProps extends CommonComponentProps {
  setOpeningRemarksModal: (value: boolean) => void;
  updateAdvancedConfigParamsDebounce: (
    updateParams: AdvancedConfigUpdate
  ) => void;
  handlePresetQuestionChange: (index: number, value: string) => void;
}

export interface ChatBackgroundProps extends CommonComponentProps {
  uploadProps: UploadProps;
  chatBackgroundInfo: ChatBackgroundInfo | null;
  setChatBackgroundInfo: (value: ChatBackgroundInfo | null) => void;
}

export interface UseAdvancedConfigurationReturn {
  advancedConfig: AdvancedConfigType;
  handleAdvancedConfigChange: (callback: () => void) => void;
  updateAdvancedConfigParams: (updateParams: AdvancedConfigUpdate) => void;
  updateAdvancedConfigParamsDebounce: (
    updateParams: AdvancedConfigUpdate
  ) => void;
  handlePresetQuestionChange: (index: number, value: string) => void;
  openingRemarksModal: boolean;
  setOpeningRemarksModal: (value: boolean) => void;
  chatBackgroundInfo: ChatBackgroundInfo | null;
  setChatBackgroundInfo: (value: ChatBackgroundInfo | null) => void;
  uploadProps: UploadProps;
}

export interface useAdvancedConfigurationProps {
  advancedConfig: AdvancedConfigType;
  handleAdvancedConfigChange: (callback: () => void) => void;
  updateAdvancedConfigParams: (updateParams: AdvancedConfigUpdate) => void;
  updateAdvancedConfigParamsDebounce: (
    updateParams: AdvancedConfigUpdate
  ) => void;
  handlePresetQuestionChange: (index: number, value: string) => void;
  openingRemarksModal: boolean;
  setOpeningRemarksModal: (value: boolean) => void;
  chatBackgroundInfo: ChatBackgroundInfo | null;
  setChatBackgroundInfo: (value: ChatBackgroundInfo | null) => void;
  uploadProps: UploadProps;
}
