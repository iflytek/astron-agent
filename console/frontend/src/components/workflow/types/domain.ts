import type { ReactNode } from 'react';
import type { KnowledgeItem } from './modal/add-knowledge';
import type { Edge, Node, Viewport } from 'reactflow';
import type { AgentNodeParam } from './nodes/agent';
import type { ChatDebuggerNodeData } from './drawer/chat-debugger';
import type { ModelConfigParam, ModelInfo } from '@/types/model';

export interface WorkflowServiceModelConfig {
  serviceBlock: Record<string, { fields: ModelConfigParam[] }[]>;
}

export type WorkflowModel = Omit<ModelInfo, 'config' | 'llmSource'> & {
  config: string | WorkflowServiceModelConfig;
  llmSource: number;
};

/** A reference can be empty while the user is choosing an upstream output. */
export interface VariableReference {
  id?: string;
  nodeId?: string;
  name?: string;
}

export type ParameterValue =
  | { type: 'ref'; content: VariableReference; contentErrMsg?: string }
  | {
      type: 'literal';
      content: string | (string | number)[];
      contentErrMsg?: string;
    };

/** Nested properties use `type`; root parameters keep their type in `schema`. */
export interface ParameterProperty {
  id: string;
  name: string;
  type?: string;
  schema?: ParameterSchema;
  properties?: ParameterProperty[];
  default?: unknown;
  required?: boolean;
  nameErrMsg?: string;
  description?: string;
  descriptionErrMsg?: string;
  allowedFileType?: string[];
  fileType?: string;
  customParameterType?: string;
  disabled?: boolean;
  deleteDisabled?: boolean;
  isChild?: boolean;
  refId?: string;
  key?: string;
  title?: ReactNode;
}

export interface ParameterSchema {
  type: string;
  value?: ParameterValue;
  properties?: ParameterProperty[];
  default?: unknown;
  description?: string;
  descriptionErrMsg?: string;
}

export interface WorkflowOutput extends ParameterProperty {
  schema: ParameterSchema;
}

export interface WorkflowInput extends WorkflowOutput {
  schema: ParameterSchema & { value: ParameterValue };
}

export interface WorkflowCondition {
  id: string;
  leftVarIndex?: string;
  rightVarIndex?: string;
  varIndex?: string;
  compareOperator?: string | null;
  compareOperatorErrMsg?: string;
  selectCondition?: string | null;
  fieldName?: string | null;
  fieldType?: string | null;
  fieldErrMsg?: string;
}

export interface WorkflowCase {
  id: string;
  logicalOperator?: string;
  level?: number;
  conditions: WorkflowCondition[];
}

export interface IntentChain {
  id: string;
  name: string;
  description: string;
  nameErrMsg?: string;
  descriptionErrMsg?: string;
  intentType?: number;
}

export interface AnswerOption {
  id: string;
  type: number;
  content: string;
  content_type?: string;
  contentErrMsg?: string;
  name?: string;
}

export interface LoopVariable {
  id: string;
  name: string;
  schema: ParameterSchema;
  value?: ParameterValue;
  initialValue?: ParameterValue;
}

/** Fields shared by the editor's node validators; individual nodes refine these. */
export interface WorkflowNodeParameters extends AgentNodeParam {
  model?: string;
  domain?: string;
  appId?: string;
  apiKey?: string;
  apiSecret?: string;
  maxTokens?: string | number;
  uid?: string;
  template?: string;
  templateErrMsg?: string;
  systemTemplate?: string;
  prompt?: string;
  extraParams?: Record<string, number | boolean | null>;
  question?: string;
  questionErrMsg?: string;
  intentChains?: IntentChain[];
  repoId?: string | string[];
  repoIds?: string[];
  repoList?: KnowledgeItem[];
  repoType?: number;
  topN?: number;
  score?: number;
  repoTopK?: number;
  ragType?: string;
  repoIdErrMsg?: string;
  code?: string;
  codeErrMsg?: string;
  cases?: WorkflowCase[];
  maxLoopCountErrMsg?: string;
  loopVariables?: LoopVariable[];
  termination?: { conditions: WorkflowCondition[]; logicalOperator?: string };
  mode?: number;
  runMode?: 'serial' | 'parallel';
  separator?: string;
  separatorErrMsg?: string;
  outputMode?: number;
  answerType?: string;
  directAnswer?: { handleResponse?: boolean; maxRetryCounts?: number | null };
  optionAnswer?: AnswerOption[];
  dbId?: string;
  dbErrMsg?: string;
  tableName?: string | null;
  tableNameErrMsg?: string;
  assignmentList?: string[];
  orderData?: { fieldName: string; order: 'asc' | 'desc' }[];
  limit?: number | null;
  fieldNameErrMsg?: string;
  sql?: string;
  sqlErrMsg?: string;
  serviceId?: string | number;
  llmIdErrMsg?: string;
  setAnswerContentErrMsg?: string;
  needReply?: boolean;
  timeout?: number | null;
  handlingEdge?: string;
  exceptionHandlingEdge?: string;
  llmId?: number;
  llmSource?: number;
  isThink?: boolean;
  multiMode?: boolean;
  answerRole?: string;
  method?: string;
  streamOutput?: boolean;
  respFormat?: number;
  remarkVisible?: boolean;
  remark?: string;
  promptPrefix?: string;
  promptPrefixErrMsg?: string;
  reasoningTemplate?: string;
  source?: string | null;
  modelName?: string;
  modelEnabled?: boolean;
  modelId?: number;
  url?: string;
  toolDescription?: string;
  rpaDescription?: string;
  LoopStartNodeId?: string;
  IterationStartNodeId?: string;
  flowId?: string;
  spaceId?: string;
  pluginId?: string;
  operationId?: string;
  version?: string;
  businessInput?: string[];
  mcpServerId?: string;
  mcpServerUrl?: string;
  toolName?: string;
  projectId?: string;
  header?: Record<string, string>;
  assistantId?: number;
}

export interface WorkflowReference {
  id?: string;
  label: string;
  value: string;
  originId?: string;
  type?: string;
  parentType?: string;
  fileType?: string;
  parentNode?: boolean;
  disabled?: boolean;
  children?: WorkflowReference[];
  references?: WorkflowReference[];
}

export interface WorkflowNodeData extends ChatDebuggerNodeData {
  label?: string;
  icon?: string;
  description?: string;
  shrink?: boolean;
  labelEdit?: boolean;
  isLatest?: boolean;
  nodeType?: string;
  originPosition?: { x: number; y: number };
  nodeMeta: { nodeType?: string; aliasName: string };
  nodeParam: WorkflowNodeParameters;
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  references?: WorkflowReference[];
  retryConfig?: {
    shouldRetry?: boolean;
    errorStrategy?: number;
    customOutput?: string;
    timeout?: number | null;
    maxRetries?: number;
  };
  parentId?: string;
}

export interface WorkflowNodeError {
  id: string;
  icon?: string;
  name?: string;
  nodeType?: string;
  errorMsg: string;
  childErrList?: WorkflowNodeError[];
  data?: { label: string };
}

export type WorkflowNode = Node<WorkflowNodeData> & {
  nodeType: string;
  childErrList?: WorkflowNodeError[];
};

/** Debug requests contain parsed JSON values, unlike literal text in the editor. */
export interface WorkflowDebugInput extends Omit<WorkflowInput, 'schema'> {
  schema: Omit<ParameterSchema, 'value'> & {
    value:
      | { type: 'ref'; content: VariableReference; contentErrMsg?: string }
      | { type: 'literal'; content: unknown; contentErrMsg?: string };
  };
}

export type WorkflowDebugNode = Omit<WorkflowNode, 'data'> & {
  data: Omit<WorkflowNodeData, 'inputs'> & { inputs: WorkflowDebugInput[] };
};
export type WorkflowEdge = Edge;
export type WorkflowViewport = Viewport;

export interface WorkflowSnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNodeTemplate {
  idType: string;
  aliasName: string;
  description: string;
  icon?: string;
  nodeType?: string;
  position?: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowNodeCategory {
  name: string;
  nodes: WorkflowNodeTemplate[];
}

export interface TextNodeConfig {
  id: string;
  uid: string | number;
  separator: string;
  comment?: string;
}

/** Editable OpenAPI parameter tree before conversion to workflow parameters. */
export interface ToolParameterNode {
  id?: string;
  name: string;
  type: string;
  children?: ToolParameterNode[];
  open?: boolean;
  required?: boolean;
  description?: string;
  from?: number;
  fatherType?: string;
}
