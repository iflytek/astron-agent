import type {
  WorkflowTraceExecutionDetail,
  WorkflowTraceExecutionItem,
  WorkflowTraceNode,
} from '@/services/trace';

export type TraceStatus = 'success' | 'running' | 'failed';
export type TraceView = 'flame' | 'list';

export type TraceTreeNode = {
  id: string;
  name: string;
  type: string;
  kind?: 'node' | 'model' | 'iteration-group' | 'iteration-run';
  status: TraceStatus;
  rawStatus?: unknown;
  duration: number;
  offset: number;
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
  questionTokens?: number;
  firstFrameDuration?: number;
  input?: Record<string, unknown>;
  config?: Record<string, unknown>;
  output?: Record<string, unknown>;
  logs?: string[];
  modelName?: string;
  selectable?: boolean;
  children?: TraceTreeNode[];
};

export type FlattenTraceNode = TraceTreeNode & {
  depth: number;
};

export type TraceExecutionSummary = {
  id: string;
  label: string;
  totalDuration: number;
  totalTokens: number;
  status: TraceStatus;
};

export type {
  WorkflowTraceExecutionItem,
  WorkflowTraceExecutionDetail,
  WorkflowTraceNode,
};
