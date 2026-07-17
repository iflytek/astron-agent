export type PlatformAccountType =
  | 'iflytek_open_platform'
  | 'ai_ability_chat'
  | 'virtual_man'
  | 'knowledge_platform';

export interface PlatformAccountConfig {
  iflytekOpenPlatform?: {
    platformAppId?: string;
    platformApiKey?: string;
    platformApiSecret?: string;
    sparkApiPassword?: string;
    sparkRtasrApiKey?: string;
  };
  aiAbilityChat?: {
    baseUrl?: string;
    model?: string;
    apiKey?: string;
  };
  virtualMan?: {
    sparkVirtualManAppId?: string;
    sparkVirtualManApiKey?: string;
    sparkVirtualManApiSecret?: string;
  };
  knowledgePlatform?: {
    ragflow?: {
      baseUrl?: string;
      apiToken?: string;
      timeout?: number;
      defaultGroup?: string;
    };
    xinghuo?: {
      datasetId?: string;
    };
  };
  configured?: boolean;
}

export interface PlatformAccountCard {
  type: PlatformAccountType;
  name: string;
  configured: boolean;
  config: PlatformAccountConfig;
}

export interface PlatformAccountRuntimeConfig {
  sparkAppId?: string;
  sparkVirtualManAppId?: string;
  iflytekOpenPlatformConfigured: boolean;
  aiAbilityChatConfigured: boolean;
  virtualManConfigured: boolean;
  ragflowConfigured: boolean;
  xinghuoKnowledgeConfigured: boolean;
}
