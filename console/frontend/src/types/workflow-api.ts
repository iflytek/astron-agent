import type { ToolConfig } from '@/types/plugin-store';
import type { FlowType } from '@/components/workflow/types';
import type { WorkflowModel } from '@/components/workflow/types/domain';

/** PageData<WorkflowVo> returned by WorkflowController.list. */
export interface WorkflowPage {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  pageData: FlowType[];
}

export interface WorkflowListParams {
  current?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: number;
  flowId?: string;
}

/** WorkflowDialog stores its question and answer as JSON strings. */
export interface WorkflowDialogue {
  runId?: string;
  eventId?: string;
  interrupt?: {
    event_id?: string;
    node_id?: string;
    need_reply?: boolean;
    value?: {
      type?: string;
      option?: import('@/components/workflow/types/drawer/chat-debugger').OptionItem[];
    };
  };
  status?: string;
  resolvedAgents?: Record<string, { agentId: number; versionId: number }>;
  id: string;
  workflowId: string;
  chatId: string;
  question: string;
  answer: string;
  questionItem: string;
  answerItem: string;
  sid?: string;
  type: number;
}

export interface WorkflowModelsResponse {
  workflow: { modelList: WorkflowModel[] }[];
}

/** PromptTemplate after listPagePromptTemplate expands its prompt JSON. */
export interface AgentPromptTemplate {
  id: number;
  name: string;
  description: string;
  adaptationModel: string;
  maxLoopCount: number;
  characterSettings: string;
  thinkStep: string;
  userQuery: string;
  createdTime?: string;
  updatedTime?: string;
  inputs: { name: string }[];
  jsonAdaptationModel?: Record<string, unknown>;
}

export interface AgentPromptPage {
  pageData: AgentPromptTemplate[];
  totalCount: number;
}

/** McpServerTool, including the snake_case JSON names declared by the backend. */
export interface McpServerTool {
  id: string;
  name: string;
  server_url: string;
  brief: string;
  logo_url: string;
  create_time: string;
  spark_id?: string;
  flow_id?: string;
  record_id?: string;
  mcp_type?: string;
  hasConfig?: boolean;
  authorized?: boolean;
  childName?: string;
  tools?: ToolConfig[];
  tags?: string[];
}
