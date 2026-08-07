import type { MessageListType } from '@/types/chat';
import http from '@/utils/http';

export interface AgentDebugSession {
  id: string;
  botId: number;
  title?: string | null;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
}

export interface AgentDebugMessage {
  id?: number | string;
  sessionId: string;
  message: MessageListType;
  createdAt?: string;
}

export interface CreateAgentDebugSessionParams {
  botId: number;
  title?: string;
}

export interface SaveAgentDebugMessagesParams {
  sessionId: string;
  messages: MessageListType[];
}

export const buildDebugSessionTitle = (
  session: Pick<AgentDebugSession, 'title'>
): string => {
  return session.title?.trim() || '未命名调试会话';
};

export const getAgentDebugSessions = (
  botId: number
): Promise<AgentDebugSession[]> => {
  return http.get('/agent-debug/sessions', {
    params: { botId },
  });
};

export const createAgentDebugSession = (
  params: CreateAgentDebugSessionParams
): Promise<AgentDebugSession> => {
  return http.post('/agent-debug/sessions', params);
};

export const getAgentDebugMessages = (
  sessionId: string
): Promise<MessageListType[]> => {
  return http.get(`/agent-debug/sessions/${sessionId}/messages`);
};

export const saveAgentDebugMessages = (
  params: SaveAgentDebugMessagesParams
): Promise<void> => {
  return http.put(`/agent-debug/sessions/${params.sessionId}/messages`, {
    messages: params.messages,
  });
};

export const deleteAgentDebugSession = (sessionId: string): Promise<void> => {
  return http.delete(`/agent-debug/sessions/${sessionId}`);
};

export const clearAgentDebugSessions = (botId: number): Promise<void> => {
  return http.delete('/agent-debug/sessions', {
    params: { botId },
  });
};
