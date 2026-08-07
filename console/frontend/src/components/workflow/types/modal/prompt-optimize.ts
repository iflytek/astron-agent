// Prompt Optimize Modal 相关类型定义

export interface WebSocketMessage {
  payload?: {
    choices?: {
      text?: Array<{
        content: string;
      }>;
    };
  };
  header?: {
    status: number;
  };
}
