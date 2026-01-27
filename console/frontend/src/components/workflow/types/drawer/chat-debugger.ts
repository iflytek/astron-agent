// Chat Debugger 模块的类型定义
import React from 'react';

// 开始节点参数类型定义
export interface StartNodeType {
  name: string;
  type: string;
  allowedFileType?: string;
  fileType?: string;
  default: string | boolean | number | string[] | FileItem[];
  description?: string;
  required: boolean;
  validationSchema: ValidationSchema | null;
  errorMsg: string;
  originErrorMsg: string;
}

// 文件项类型定义
export interface FileItem {
  url: string;
  name?: string;
  loading?: boolean;
}

// 验证模式类型定义
export interface ValidationSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

// 中断聊天类型定义
export interface InterruptChatType {
  eventId: string;
  interrupt: boolean;
  nodeId: string;
  type: string;
  option: OptionItem[] | null;
  needReply: boolean;
}

// 选项项类型定义
export interface OptionItem {
  id: string;
  label: string;
  value: string;
}

// 聊天信息类型定义
export interface ChatInfoType {
  question: StartNodeType[];
  answer: {
    messageContent: string;
    reasoningContent: string;
    content: string;
    option?: OptionItem[];
  };
  answerItem: string;
  option: OptionItem[] | null;
  sid?: string;
}

// 聊天列表项类型定义
export interface ChatListItem {
  id: string;
  type: 'ask' | 'answer' | 'divider';
  inputs?: StartNodeType[];
  messageContent?: string;
  reasoningContent?: string;
  content?: string;
  option?: OptionItem[];
  showResponse?: boolean;
  chatId?: string;
}

// 高级配置类型定义（简化版）
export interface ChatDebuggerAdvancedConfig {
  suggestedQuestionsAfterAnswer: {
    enabled: boolean;
  };
}

// 响应结果类型定义
export interface ResponseResult {
  timeCost?: number;
  tokenCost?: number;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  errorOutputs?: Record<string, unknown>;
  rawOutput?: unknown;
  nodeAnswerContent?: string;
  reasoningContent?: string;
  status: 'success' | 'failed';
  failedReason?: string;
  answerMode?: number;
}

// 节点调试结果类型定义
export interface NodeDebuggerResult {
  answerMode?: number;
  answerContent?: string;
  reasoningContent?: string;
  done: boolean;
  timeCost?: number;
  tokenCost?: number;
  input?: unknown;
  rawOutput?: unknown;
  output?: unknown;
  errorOutputs?: unknown;
  failedReason?: string;
  cancelReason?: string;
}

// 节点数据类型扩展
export interface ChatDebuggerNodeData {
  status?: 'running' | 'success' | 'failed' | 'cancel' | '';
  debuggerResult?: NodeDebuggerResult;
  updatable?: boolean;
}

// 讯飞机器人配置类型定义
export interface XfYunBotConfig {
  chatId?: string;
  botId?: string;
}

// 对话机器人配置类型定义
export interface TalkAgentConfig {
  interactType: string;
  vcn: string;
  scene: string;
  sceneMode: string;
  sceneEnable: number;
  vcnEnable: number;
  callSceneId: string;
}

// 对话API参数类型定义
export interface DialogueParams {
  chatId: string;
  type: number;
  workflowId?: string;
  sid?: string;
  questionItem: string;
  answerItem: string;
  question: string;
  answer: string;
}

// 工作流聊天参数类型定义
export interface WorkflowChatParams {
  flow_id?: string;
  inputs: Record<string, unknown>;
  chatId: string;
  regen?: boolean;
  version?: string;
  promptDebugger?: boolean;
}

// 恢复聊天参数类型定义
export interface ResumeChatParams {
  flow_id?: string;
  eventId: string;
  eventType: 'resume' | 'ignore' | 'abort';
  content?: string;
  version?: string;
  promptDebugger?: boolean;
}

// Chat Debugger Content Props 类型定义
export interface ChatDebuggerContentProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

// React Flow Node 类型定义
export interface ReactFlowNode {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
  position?: { x: number; y: number };
  [key: string]: unknown;
}

// React Flow Edge 类型定义
export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

// Chat Content Props 类型定义
export interface ChatContentProps {
  open: boolean;
  userWheel: boolean;
  setUserWheel: (userWheel: boolean) => void;
  chatList: ChatListItem[];
  setChatList: (
    chatList: ChatListItem[] | ((prev: ChatListItem[]) => ChatListItem[])
  ) => void;
  startNodeParams: StartNodeType[];
  resetNodesAndEdges: () => { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] };
  handleRunDebugger: (
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    inputs?: StartNodeType[],
    regen?: boolean
  ) => void;
  debuggering: boolean;
  suggestProblem: string[];
  suggestLoading: boolean;
  needReply: boolean;
  handleResumeChat: (content: string) => void;
  handleStopConversation: () => void;
  chatType: string;
}

// 语音配置类型定义
export interface VcnConfig {
  id: string;
  name: string;
  vcn: string;
}

// 聊天高级配置类型定义（扩展版）
export interface ChatContentAdvancedConfig {
  prologue: {
    enabled: boolean;
    prologueText: string;
    inputExample: string[];
  };
  feedback: {
    enabled: boolean;
  };
  textToSpeech: {
    enabled: boolean;
    vcn_cn?: string;
  };
  speechToText: {
    enabled: boolean;
  };
  suggestedQuestionsAfterAnswer: {
    enabled: boolean;
  };
  chatBackground: {
    enabled: boolean;
    info: {
      url?: string;
    } | null;
  };
}

// 聊天项扩展类型
export interface ChatListItemExtended extends ChatListItem {
  copied?: boolean;
  good?: boolean;
  bad?: boolean;
  sid?: string;
}

// 语音广播实例类型定义
export interface VoiceBroadcastInstance {
  closeWebsocketConnect(): void;
  establishConnect(content: string, param2: boolean, vcn?: string): void;
}

// Chat Input Props 类型定义
export interface ChatInputProps {
  interruptChat: InterruptChatType;
  startNodeParams: StartNodeType[];
  setStartNodeParams: (
    params: StartNodeType[] | ((prev: StartNodeType[]) => StartNodeType[])
  ) => void;
  textareRef: React.RefObject<HTMLTextAreaElement>;
  handleEnterKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

// 上传文件响应类型定义
export interface FileUploadResponse {
  code: number;
  data?: string[];
  message?: string;
}

// 文件上传项扩展类型
export interface FileUploadItem extends FileItem {
  id: string;
  name: string;
  size: number;
  loading?: boolean;
}

// AJV验证错误类型定义
export interface AjvValidationError {
  instancePath?: string;
  message?: string;
}

// 从ReactFlow导入Position类型，不需要重新定义
// export type Position = 'top' | 'right' | 'bottom' | 'left'; // 已由reactflow库提供

// Edge 对象类型定义
export interface WorkflowEdge extends ReactFlowEdge {
  data?: EdgeData;
}

// Custom Edge 相关类型定义
export interface EdgeData {
  edgeType?: 'polyline' | 'bezier';
}

// Custom Edge Props 类型定义（使用ReactFlow的Position类型）
export interface CustomEdgeProps {
  data?: EdgeData;
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: import('reactflow').Position | undefined;
  targetPosition: import('reactflow').Position | undefined;
  style?: React.CSSProperties;
  markerEnd?: string;
}

// Edge Store 类型定义
export interface EdgeStoreState {
  edges: ReactFlowEdge[];
  setEdges: (updater: (edges: ReactFlowEdge[]) => ReactFlowEdge[]) => void;
  removeNodeRef: (sourceId: string, targetId: string) => void;
  takeSnapshot: () => void;
}

// Chat Result 相关类型定义
export interface ResultNodeData {
  name?: string;
  input?: Record<string, unknown>;
  rawOutput?: unknown;
  output?: Record<string, unknown>;
  answerContent?: string;
  failedReason?: string;
  answerMode?: number;
}

export interface FlowResultType {
  status?: string;
  timeCost?: string | number;
  totalTokens?: string | number;
}

// Chat Result Props 类型定义
export interface ChatResultProps {
  // 组件内部使用，不需要显式props
}

export interface CodeIDEAMaskProps {
  setShowPythonPackageModal: (show: boolean) => void;
}

export interface VarData {
  name: string;
  type?: string;
}

export interface CodeRunParams {
  code: string;
  variables: Array<{
    name: string;
    content: unknown;
  }>;
  app_id?: string;
  uid?: string;
  flow_id?: string;
}

export interface CodeRunResponse {
  code: number;
  data?: unknown;
  message?: string;
}

export interface AICodeParams {
  code?: string;
  prompt?: string;
  var?: string;
  errMsg?: string;
}

export interface AICodeResponse {
  payload?: {
    message?: {
      content?: string;
    };
  };
  header?: {
    status?: number;
  };
}

export interface CodeIDEADrawerlInfo {
  open: boolean;
  nodeId: string;
}

// 构建流参数类型定义
export interface BuildFlowParams {
  id?: string;
  flowId?: string;
  name?: string;
  description?: string;
  data: {
    nodes: unknown[];
    edges: unknown[];
  };
  version?: string;
}

// WebSocket消息数据类型定义
export interface WebSocketMessageData {
  data?: string;
  choices?: Array<{
    finish_reason?: string | null;
    delta?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  workflow_step?: {
    node?: {
      id?: string;
      finish_reason?: string | null;
      executed_time?: number;
      usage?: {
        total_tokens?: number;
      };
      inputs?: Record<string, unknown>;
      outputs?: Record<string, unknown>;
      error_outputs?: Record<string, unknown>;
      ext?: {
        raw_output?: unknown;
        answer_mode?: number;
      };
    };
  };
  event_data?: {
    event_id?: string;
    need_reply?: boolean;
    value?: {
      content?: string;
      type?: string;
      option?: OptionItem[];
    };
  };
  code?: number;
  message?: string;
  id?: string;
  executedTime?: number;
  usage?: {
    total_tokens?: number;
  };
}

// Debugger Check 相关类型定义
export interface OperationResultProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export interface ErrorNode {
  id: string;
  name: string;
  icon: string;
  errorMsg: string;
  childErrList?: ChildErrorNode[];
}

export interface ChildErrorNode {
  id: string;
  name: string;
  icon: string;
  errorMsg: string;
}

export interface PositionData {
  x: number;
  y: number;
  zoom: number;
}

// Node Detail 相关类型定义
export interface NodeInfoEditDrawerlInfo {
  open: boolean;
  nodeId: string;
}

export interface RootStyle {
  height: number;
  top: number;
  right: number;
}

export interface NodeDetailComponent {
  id?: string;
  nodeType?: string;
  data?: unknown; // 保持any以兼容现有的node数据结构
}

export interface NodeCommonResult {
  renderTypeOneClickUpdate: () => React.ReactElement | null;
  showNodeOperation: boolean;
  nodeDesciption: string;
  isCodeNode: boolean;
}

// Single Node Debugging 相关类型定义
export interface SingleNodeDebuggingProps {
  id: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  refInputs: RefInput[];
  setRefInputs: (
    inputs: RefInput[] | ((prev: RefInput[]) => RefInput[])
  ) => void;
  nodeDebugExect: (originalNode: unknown, debuggerNode: unknown) => void;
}

export interface RefInput {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  fileType?: string;
  default?: unknown;
  errorMsg?: string;
}

export interface UploadFileItem {
  id: string;
  name: string;
  size: number;
  loading: boolean;
  url?: string;
}

export interface UploadResponse {
  code: number;
  data?: string[];
}

// Version Management 相关类型定义
export interface VersionManagementProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  operationResultOpen: boolean;
}

export interface DrawerStyle {
  height: number;
  top: number;
  right: number;
  zIndex: number;
}

export interface VersionItem {
  id: string;
  name: string;
  versionNum: string;
  createdTime: string;
  data: string;
  flowId: string;
}

export interface PublicResultItem {
  publishChannel: number;
  publishResult: string;
}

export interface FeedbackItem {
  id: string;
  createTime: string;
  picUrl?: string;
  description?: string;
}

export interface TabType {
  version: string;
  feedback: string;
}

// UseFlowCommon Hook 相关类型定义
export interface AddNodeType {
  idType: string;
  icon: string;
  description: string;
  aliasName: string;
  data: {
    nodeMeta: {
      aliasName: string;
    };
    nodeParam: unknown;
    outputs?: unknown[];
  };
  nodeType?: string;
}

export interface ToolType {
  toolId: string;
  operationId: string;
  description: string;
  name: string;
  version?: string;
  webSchema?: string;
}

export interface FlowType {
  flowId: string;
  appId: string;
  description: string;
  name: string;
  version?: string;
  ioInversion?: {
    inputs: unknown[];
    outputs: unknown[];
  };
}

export interface McpType {
  spark_id: string;
  server_url: string;
  mcpId: string;
  name: string;
  description: string;
  args: unknown[];
}

export interface PositionType {
  x: number;
  y: number;
}

export interface NewNodeType {
  id: string;
  type: string;
  nodeType?: string;
  position: PositionType;
  selected: boolean;
  data: unknown;
  parentId?: string;
  extent?: string;
  zIndex?: number;
  draggable?: boolean;
}

export interface IFlyCollectorType {
  onEvent: (
    eventName: string,
    params: Record<string, unknown>,
    category: string
  ) => void;
}

export interface UseChatContentProps {
  advancedConfig: ChatContentAdvancedConfig;
  goodFeedback: (id: string | undefined, sid: string) => void;
  badFeedback: (id: string | undefined, sid: string) => void;
  modalVisible: boolean;
  sid: string | undefined;
  modalType: 'good' | 'bad';
  setModalVisible: (visible: boolean) => void;
  handleActiveStyle: (style: string) => void;
  renderInputElement: (input: unknown) => React.ReactElement;
  setSid: (sid: string) => void;
  copyData: (data: unknown) => void;
}

export interface UseChatInputProps {
  uploadComplete: (
    event: ProgressEvent<EventTarget>,
    index: number,
    fileId: string
  ) => void;
  handleFileUpload: (
    file: File,
    index: number,
    multiple: boolean,
    fileId: string
  ) => void;
  handleDeleteFile: (index: number, fileId: string) => void;
  handleChangeParam: (
    index: number,
    fn: (data: StartNodeType, value: unknown) => void,
    value: unknown
  ) => void;
}

export interface UseChatDebuggerContentProps {
  startNode: StartNodeType;
  trialRun: boolean;
  multiParams: boolean;
  xfYunBot: XfYunBotConfig;
  talkAgentConfig: TalkAgentConfig;
}
