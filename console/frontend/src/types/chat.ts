// 聊天相关的类型定义

// 文件上传支持配置接口
export interface SupportUploadConfig {
  /** 图标类型 */
  icon: string;
  /** 提示文本 */
  tip: string;
  /** 接受的文件类型 */
  accept: string;
  /** 业务类型 */
  businessType: number;
  /** 配置值 */
  value: number;
  /** 上传限制数量 */
  limit: number;
  /** 是否必填 */
  required: boolean | null;
  /** 字段名称 */
  name: string;
  /** 文件类型 */
  type: string;
}

// 收藏列表相关类型定义
export interface FavoriteBot {
  version: number | null;
  marketBotId: number;
  botId: number;
  uid: string | null;
  chatId: string | number | null;
  title: string | null;
  botName: string;
  botType: number;
  avatar: string;
  prompt: string | null;
  botDesc: string;
  botNameEn: string | null;
  botStatus: number;
  isDelete: number | null;
  blockReason: string | null;
  hotNum: string | number | null;
  showIndex: number | null;
  supportContext: number | boolean; // 支持 1/0 和 boolean
  mine: boolean;
  isFavorite: number | boolean; // 支持 1/0 和 boolean
  enable: number | null;
  hasTemplate: boolean;
  action: unknown | null;
  extra: unknown | null;
  logo: string | null;
  clientHide: string | null;
  tags: unknown[] | null;
  creatorName: string | null;
  auditTime: string | null;
  createTime: string;
  updateTime: string | null;
}

export interface FavoriteEntry {
  addStatus: number | null;
  creator: string;
  chatId: number | string | null;
  enableStatus: number | null;
  bot: FavoriteBot;
}

export interface FavoriteListResponse {
  total: number;
  pageList: FavoriteEntry[];
}

// 聊天列表项类型定义
export interface PostChatItem {
  id: number;
  uid: string;
  title: string;
  isDelete: number | null;
  enable: number;
  chatId: string | number | null;
  enabledPluginIds: string;
  botDesc: string;
  botDescEn: string | null;
  hotNum: number | string | null;
  botType: string; // 注意：为 string
  botName: string;
  botNameEn: string | null;
  botId: number;
  botStatus: number | null;
  marketBotId: number | null;
  botAvatar: string;
  marketBotUid: string | null;
  botUid: string | null;
  clientHide: string;
  creatorName: string | null;
  createTime: string;
  updateTime: string;
  albumVisible: number | null;
  supportContext: number; // 0/1
  sticky: number; // 0/1
  isFavorite: number; // 0/1
  action: unknown | null;
  extra: unknown | null;
  blockReason: string | null;
  version: number;
  tags: unknown[] | null;
  recommend: unknown | null;
  virtualAgentId: number | null;
}

export interface BotInfoType {
  pcBackground: string;
  botStatus: number;
  chatId: number;
  supportUploadConfig: SupportUploadConfig[];
  model: string;
  botId: number;
  creatorNickname: string;
  prologue: string;
  mine: boolean;
  botName: string;
  avatar: string;
  botDesc: string;
  version: number;
  inputExample: string[];
  supportContext: boolean;
  isFavorite: number;
  vcnCn: string;
  advancedConfig?: string;
  openedTool?: string;
  config?: string[];
}

// 创建聊天接口
export interface CreateChatResponse {
  id: number;
}

// 聊天选项接口
export interface Option {
  id: string;
  text: string;
  selected?: boolean;
  contentType?: string;
}

// 工作流事件数据接口
export interface WorkflowEventData {
  content?: string;
  option?: Option[];
  type?: string;
  workflowOperation?: string[];
}

// 基础消息接口
export interface MessageListType {
  id?: number;
  message: string;
  reasoning?: string;
  traceSource?: string;
  sourceType?: 'search' | 'web_search' | string;
  chatFileList?: UploadFileInfo[] | null;
  reqId?: number;
  reqType?: string;
  sid?: string;
  tools?: string[];
  updateTime?: string;
  workflowEventData?: WorkflowEventData;
}

// 溯源数据
export interface SourceInfoItem {
  index?: number;
  url: string;
  title: string;
}

// Web搜索结果项
export interface WebSearchOutput {
  index: number;
  url: string;
  title: string;
}

// Web搜索工具结果
export interface WebSearchResult {
  outputs: WebSearchOutput[];
}

// 工具项基础接口
interface ToolItem {
  deskToolName: string;
  status: string;
  type: string;
}

// Web搜索工具项
interface WebSearchToolItem extends ToolItem {
  type: 'web_search';
  web_search: WebSearchResult;
}

// 所有工具项的联合类型
export type ToolItemUnion = WebSearchToolItem;

// 聊天数据接口
export interface ChatData {
  chatId: number;
  chatFileListNoReq: unknown[];
  historyList: MessageListType[];
}

// web bot 信息
export interface WebBotInfo {
  advancedConfig?: string;
  openedTool: string;
  config: string[];
}

// API响应接口
export interface ChatApiResponse {
  code: number;
  message: string;
  data: ChatData[];
}

//对话历史接口返回
export interface ChatHistoryResponse {
  chatFileListNoReq: UploadFileInfo[];
  historyList: MessageListType[];
}

//语音转写
export interface RtasrTokenResponse {
  appid: string; // 应用ID
  ts: string; // 时间戳
  signa: string; // 签名
  url: string; // WebSocket连接地址 ← 新增字段
}

// 聊天Store状态接口
export interface ChatState {
  messageList: MessageListType[];
  chatFileListNoReq: UploadFileInfo[];
  streamingMessage: MessageListType | null; //正在流式输出的消息
  streamId: string; //对话流id
  answerPercent: number; //回答进度
  controllerRef: AbortController; //控制器
  isLoading: boolean; //是否正在加载
  currentToolName: string; //当前调用工具名称
  traceSource: string; //溯源结果
  deepThinkText: string; //深度思考文本
  currentChatId: number; //当前聊天id
  workflowOperation: string[]; //工作流操作
  isWorkflowOption: boolean; //是否是选项
  workflowOption: {
    option: Option[];
    content?: string;
  }; //工作流选项
  vmsInteractiveRef: any; //虚拟人sdk实例
  vmsInteractiveRefStatus: string; //虚拟人实例状态，主要记录是否被打断了
  vmsInteractiveRefPlayer: any; //虚拟人sdk实例播放器
  chatType: string; //聊天类型四种:1、文本 2、语音通话 3、虚拟人播报 4、语音虚拟人
}

// 聊天Store操作接口
export interface ChatActions {
  initChatStore: () => void; //初始化聊天store
  setMessageList: (messageList: MessageListType[]) => void; //设置消息列表
  setChatFileListNoReq: (chatFileListNoReq: UploadFileInfo[]) => void; //设置聊天文件列表
  addMessage: (message: MessageListType) => void; //添加消息
  startStreamingMessage: (message: MessageListType) => void; //开始流式消息
  updateStreamingMessage: (content: string) => void; //更新流式消息内容
  finishStreamingMessage: (sid?: string, reqId?: number) => void; //完成流式消息
  clearStreamingMessage: () => void; //清除流式消息
  setStreamId: (streamId: string) => void; //设置对话流id
  setAnswerPercent: (answerPercent: number) => void; //设置回答进度
  setControllerRef: (controllerRef: AbortController) => void; //设置控制器
  setIsLoading: (isLoading: boolean) => void; //设置是否正在加载
  setCurrentToolName: (currentToolName: string) => void; //设置当前调用工具名称
  setTraceSource: (traceSource: string) => void; //设置溯源结果
  setDeepThinkText: (deepThinkText: string) => void; //设置深度思考文本
  setCurrentChatId: (currentChatId: number) => void; //设置当前聊天id
  setWorkflowOperation: (workflowOperation: string[]) => void; //设置工作流操作
  setIsWorkflowOption: (isWorkflowOption: boolean) => void; //设置是否是选项
  setWorkflowOption: (workflowOption: {
    option: Option[];
    content?: string;
  }) => void; //设置工作流选项
  setVmsInteractiveRef: (vmsInteractiveRef: any) => void;
  setVmsInteractiveRefPlayer: (vmsInteractiveRefPlayer: any) => void;
  setVmsInteractiveRefStatus: (vmsInteractiveRefStatus: string) => void;
  getVmsInteractiveRefPlayer: () => any;
  getVmsInteractiveRefStatus: () => string;
  setChatType: (chatType: string) => void;
  getChatType: () => string;
}

// 文件上传相关类型定义

/** S3预签名响应接口 */
export interface S3PresignResponse {
  /** 上传URL */
  url: string;
  /** 存储桶名称 */
  bucket: string;
  /** 对象Key */
  objectKey: string;
}

/** 上传文件信息接口 */
export interface UploadFileInfo {
  /** 文件唯一标识 */
  uid: string;
  /** 文件ID（上传完成后生成） */
  fileId?: string;
  /** 文件对象 */
  file: File;
  /** 文件类型 */
  type: string;
  /** 文件名 */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 文件业务Key */
  fileBusinessKey: string;
  /** 文件URL（上传完成后生成） */
  fileUrl?: string;
  /** 上传进度（0-100） */
  progress: number;
  /** 上传状态 */
  status: 'uploading' | 'completed' | 'error' | 'pending';
  /** 错误信息 */
  error?: string;
  /** 参数名称（用于绑定接口） */
  paramName?: string;
  /** 输入名称（对应 config.name，用于区分不同输入类型） */
  inputName?: string;
}
