export interface HeaderFeedbackModalProps {
  visible: boolean;
  onCancel: () => void;
}

export interface BotMarketItem {
  id: number;
  botName: string;
  botDesc: string;
  botTemplate: string;
  botType: number;
  botTypeName: string;
  inputExample: string;
  prompt: string;
  promptStructList: Array<{
    id: number;
    promptKey: string;
    promptValue: string;
  }>;
  promptType: number;
  supportContext: number;
  botStatus: number;
  language: string;
  createTime: string;
  updateTime: string;
  inputExampleList: string[];
  [key: string]: unknown;
}

export interface QuickCreateBotResponse {
  [key: string]: unknown;
}
