// Select LLM Prompt Modal 相关类型定义

export interface PromptItem {
  id: string;
  name: string;
  promptKey: string;
  commitTime: string;
  publishTime: string;
  inputs: string;
  variableList?: Array<{
    name: string;
  }>;
  promptText?: {
    messageList?: Array<{
      content: string;
    }>;
  };
  promptInput?: {
    variableList?: Array<{
      name: string;
    }>;
  };
  modelConfig?: {
    llmVersion: string;
    maxTokens: number;
    temperature: number;
    topK: number;
  };
}
