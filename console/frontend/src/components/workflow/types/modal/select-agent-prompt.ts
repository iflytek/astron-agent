// Select Agent Prompt Modal 相关类型定义

export interface AgentPromptItem {
  id: string;
  name: string;
  description: string;
  characterSettings: string;
  thinkStep: string;
  userQuery: string;
  adaptationModel: string;
  commitTime: string;
  publishTime: string;
  maxLoopCount: number;
  inputs?: Array<{
    name: string;
  }>;
  modelInfo?: {
    llmId: string;
    domain: string;
    serviceId: string;
    patchId: string;
    url: string;
    id: string;
    isThink: boolean;
    llmSource: number;
    icon: string;
    name: string;
  };
}

export interface useSelectPromptType {
  dataSource: AgentPromptItem[];
  setDataSource: (dataSource: AgentPromptItem[]) => void;
  value: string;
  setValue: (value: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  currentTemplateId: string;
  setCurrentTemplateId: (currentTemplateId: string) => void;
  handleAddTemplateDataToNode: (res: AgentPromptItem) => void;
  currentTemplate: unknown;
}
