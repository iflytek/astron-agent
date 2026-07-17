import http from '@/utils/http';

export interface AgentMemoryConfig {
  botId: number;
  provider: string;
  enabled: boolean;
  hasApiKey: boolean;
  autoSearch: boolean;
  searchTopK: number;
  minScore: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveAgentMemoryConfigParams {
  botId: number;
  provider?: string;
  enabled: boolean;
  apiKeyCiphertext?: string;
  autoSearch: boolean;
  searchTopK: number;
  minScore: number;
}

export interface AgentMemoryItem {
  id: string;
  memory: string;
  score?: number | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export const getAgentMemoryConfig = (
  botId: number
): Promise<AgentMemoryConfig> => {
  return http.get('/agent-memory/config', {
    params: { botId },
  });
};

export const saveAgentMemoryConfig = (
  params: SaveAgentMemoryConfigParams
): Promise<AgentMemoryConfig> => {
  return http.put('/agent-memory/config', params);
};

export const getAgentMemories = (botId: number): Promise<AgentMemoryItem[]> => {
  return http.get('/agent-memory/memories', {
    params: { botId },
  });
};

export const deleteAgentMemory = (
  botId: number,
  memoryId: string
): Promise<void> => {
  return http.delete(`/agent-memory/memories/${memoryId}`, {
    params: { botId },
  });
};

export const clearAgentMemories = (botId: number): Promise<void> => {
  return http.delete('/agent-memory/memories', {
    params: { botId },
  });
};
