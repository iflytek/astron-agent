import http from '@/utils/http';
import { fetchSseWithContext } from '@/utils/sse-request';
import { getLanguageCode } from '@/utils/http';
import useSpaceStore from '@/store/space-store';

export type AgentKind = 'chat' | 'debug';

export interface AgentDefinition {
  id: number;
  botName: string;
  botDesc: string;
  prompt: string;
  modelId?: number | null;
  model?: string;
  supportContext: boolean;
  supportUpload: boolean;
  personality: {
    enabled: boolean;
    personality?: string;
    sceneInfo?: string;
    sceneType?: number;
  };
  tools: number[];
  skills: number[];
  mcpServerIds: number[];
  readonly mcpServerUrls: string[];
  repoIds: number[];
  readonly legacyDatasetIds?: string[];
  maxLoopCount: number;
  revision?: number;
  readonly configuredMcpCount?: number;
  promptType?: number;
  promptSections?: Array<{ key: string; value: string }>;
  favorite?: boolean;
  spaceId?: number | null;
  uid?: string;
  createdAt?: string;
  updatedAt?: string;
}

type AgentResourceSelection = Pick<
  AgentDefinition,
  'tools' | 'skills' | 'mcpServerIds' | 'repoIds'
>;

export type AgentResourceChanges = Partial<
  Record<keyof AgentResourceSelection, boolean>
>;

/** Omitted references retain their stored configuration; an explicit [] clears them. */
export const buildAgentResourceUpdate = (
  draft: AgentResourceSelection,
  changed: AgentResourceChanges
): Partial<AgentResourceSelection> => ({
  ...(changed.tools ? { tools: draft.tools } : {}),
  ...(changed.skills ? { skills: draft.skills } : {}),
  ...(changed.mcpServerIds ? { mcpServerIds: draft.mcpServerIds } : {}),
  ...(changed.repoIds ? { repoIds: draft.repoIds } : {}),
});

export interface AgentResourceOptions {
  models: Array<{ id: number; name: string; provider?: string }>;
  tools: Array<{ id: number; name: string; toolId?: string }>;
  mcp: Array<{ id: number; name: string; url?: string }>;
  skills: Array<{ id: number; name: string }>;
  repos: Array<{ id: number; name: string }>;
}

export interface AgentSession {
  id: string;
  agentId: number;
  kind: AgentKind;
  title: string;
  updatedAt: string;
}

export interface AgentFile {
  id: string;
  name: string;
  size?: number;
  direction?: 'input' | 'output';
  legacy?: boolean;
  available?: boolean;
}

export interface AgentRun {
  id: string;
  question: string;
  answer: string;
  reasoning?: string;
  events?: Array<Record<string, unknown>>;
  status: 'completed' | 'failed' | 'cancelled' | 'interrupted' | 'running';
  createdAt: string;
  files?: AgentFile[];
}

export interface AgentMemoryConfig {
  provider: string;
  enabled: boolean;
  autoSearch: boolean;
  hasApiKey: boolean;
  searchTopK: number;
  minScore: number;
}

export interface AgentMemoryItem {
  id: string;
  memory: string;
  score?: number | null;
  metadata?: Record<string, unknown>;
}

export interface AgentStreamHandlers {
  onRun?: (data: { id: string; sessionId: string }) => void;
  onDelta?: (data: { content?: string; reasoningContent?: string }) => void;
  onTool?: (data: Record<string, unknown>) => void;
  onKnowledge?: (data: { references?: unknown[] }) => void;
  onError?: (data: { code?: number; message?: string }) => void;
  onEnd?: (data: { id: string; status: AgentRun['status'] }) => void;
}

export const listAgents = (params?: {
  search?: string;
  favorite?: boolean;
  page?: number;
  pageSize?: number;
}) =>
  http.get<unknown, { records: AgentDefinition[]; total: number }>('/agents', {
    params: {
      name: params?.search,
      favorite: params?.favorite || undefined,
      page: params?.page,
      pageSize: params?.pageSize,
    },
  });

export const getAgent = (id: number | string) =>
  http.get<unknown, AgentDefinition>(`/agents/${id}`);

export const createAgent = (payload: Partial<AgentDefinition>) =>
  http.post<unknown, AgentDefinition>('/agents', payload);

export const updateAgent = (
  id: number | string,
  payload: Partial<AgentDefinition>
) => http.put<unknown, AgentDefinition>(`/agents/${id}`, payload);

export const deleteAgent = (id: number | string) =>
  http.delete(`/agents/${id}`);

export const favoriteAgent = (id: number | string, favorite: boolean) =>
  http.post(`/agents/${id}/favorite`, { favorite });

export const listAgentVersions = (id: number | string) =>
  http.get<unknown, Array<Record<string, unknown>>>(`/agents/${id}/versions`);

export const createAgentVersion = (id: number | string) =>
  http.post<unknown, Record<string, unknown>>(`/agents/${id}/versions`);

export const getAgentResources = (id: number | string) =>
  http.get<unknown, AgentResourceOptions>(`/agents/${id}/resources`);

export const getAgentMemoryConfig = (id: number | string) =>
  http.get<unknown, AgentMemoryConfig>(`/agents/${id}/memory/config`);

export const saveAgentMemoryConfig = (
  id: number | string,
  payload: Partial<AgentMemoryConfig> & { apiKey?: string }
) =>
  http.put<unknown, AgentMemoryConfig>(`/agents/${id}/memory/config`, payload);

export const listAgentMemories = (id: number | string) =>
  http.get<unknown, AgentMemoryItem[]>(`/agents/${id}/memory/items`);

export const addAgentMemory = (id: number | string, memory: string) =>
  http.post(`/agents/${id}/memory/items`, { memory });

export const deleteAgentMemory = (id: number | string, memoryId?: string) =>
  http.delete(`/agents/${id}/memory/items`, {
    params: memoryId ? { memoryId } : undefined,
  });

export const listAgentSessions = (id: number | string, kind: AgentKind) =>
  http.get<unknown, AgentSession[]>(`/agents/${id}/sessions`, {
    params: { kind },
  });

export const createAgentSession = (
  id: number | string,
  kind: AgentKind,
  title?: string
) =>
  http.post<unknown, AgentSession>(`/agents/${id}/sessions`, { kind, title });

export const deleteAgentSession = (id: number | string, sessionId: string) =>
  http.delete(`/agents/${id}/sessions/${sessionId}`);

export const getAgentMessages = (id: number | string, sessionId: string) =>
  http.get<unknown, AgentRun[]>(`/agents/${id}/sessions/${sessionId}/messages`);

export const stopAgentRun = (id: number | string, runId: string) =>
  http.post(`/agents/${id}/runs/${runId}/stop`);

export const uploadAgentFile = (id: number | string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return http.post<unknown, { id: string; name: string; size: number }>(
    `/agents/${id}/files`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
};

export const streamAgentRun = async (
  id: number | string,
  sessionId: string,
  payload: { message: string; files?: string[]; regenerateId?: string },
  handlers: AgentStreamHandlers,
  signal: AbortSignal
): Promise<void> => {
  let ended = false;
  const scope = useSpaceStore.getState();
  const context = {
    languageCode: getLanguageCode(),
    spaceId: scope.spaceId,
    spaceType: scope.spaceType,
    enterpriseId: scope.enterpriseId,
  };
  if (signal.aborted) return;
  await fetchSseWithContext(
    `/console-api/agents/${id}/sessions/${sessionId}/stream`,
    {
      getContext: () => context,
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      openWhenHidden: true,
      signal,
      onopen: async response => {
        if (!response.ok) {
          const detail = await response.json().catch(() => null);
          throw new Error(
            `Agent stream failed (${response.status})${detail?.message ? `: ${detail.message}` : ''}`
          );
        }
        const type = response.headers.get('content-type') || '';
        if (!type.includes('text/event-stream'))
          throw new Error('Agent stream returned an invalid content type');
      },
      onmessage: event => {
        if (!event.data.trim()) return;
        let data: unknown;
        try {
          data = JSON.parse(event.data);
        } catch {
          throw new Error('Agent stream returned invalid JSON');
        }
        const value = (data && typeof data === 'object' ? data : {}) as Record<
          string,
          unknown
        >;
        switch (event.event) {
          case 'run':
            handlers.onRun?.(value as { id: string; sessionId: string });
            break;
          case 'delta':
            handlers.onDelta?.(
              value as { content?: string; reasoningContent?: string }
            );
            break;
          case 'tool':
            handlers.onTool?.(value);
            break;
          case 'knowledge':
            handlers.onKnowledge?.(value as { references?: unknown[] });
            break;
          case 'error':
            handlers.onError?.(value as { code?: number; message?: string });
            break;
          case 'end':
            ended = true;
            handlers.onEnd?.(
              value as { id: string; status: AgentRun['status'] }
            );
            break;
          default:
            break;
        }
      },
      onclose: () => {
        if (!ended && !signal.aborted)
          throw new Error('Agent stream closed before end event');
      },
      onerror: error => {
        throw error;
      },
    }
  );
};
