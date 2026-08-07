import { FeedbackItem } from './chat-debugger';
// Drawer 模块的类型定义统一导出

// Advanced Configuration 相关类型
export type {
  VcnItem,
  ChatBackgroundInfo,
  AdvancedConfigType,
  UploadResponse,
  DrawerStyleType,
  VoiceBroadcastInstance,
  DeepPartial,
  AdvancedConfigUpdate,
  CommonComponentProps,
  ConversationStarterProps,
  ChatBackgroundProps,
  UseAdvancedConfigurationReturn,
  useAdvancedConfigurationProps,
  UploadProps,
} from './advanced-config';

// Chat Debugger 相关类型
export type {
  StartNodeType,
  FileItem,
  ValidationSchema,
  InterruptChatType,
  OptionItem,
  ChatInfoType,
  ChatListItem,
  ChatDebuggerAdvancedConfig,
  FlowResultType,
  ResponseResult,
  NodeDebuggerResult,
  ChatDebuggerNodeData,
  XfYunBotConfig,
  DialogueParams,
  WorkflowChatParams,
  ResumeChatParams,
  ChatDebuggerContentProps,
  ChatContentProps,
  VcnConfig,
  ChatContentAdvancedConfig,
  ChatListItemExtended,
  ChatInputProps,
  FileUploadResponse,
  FileUploadItem,
  AjvValidationError,
  WorkflowEdge,
  EdgeData,
  CustomEdgeProps,
  EdgeStoreState,
  ResultNodeData,
  ChatResultProps,
  CodeIDEADrawerlInfo,
  CodeIDEAMaskProps,
  VarData,
  CodeRunParams,
  CodeRunResponse,
  AICodeParams,
  AICodeResponse,
  BuildFlowParams,
  WebSocketMessageData,
  OperationResultProps,
  DrawerStyle,
  ErrorNode,
  ChildErrorNode,
  PositionData,
  ReactFlowNode,
  ReactFlowEdge,
  NodeInfoEditDrawerlInfo,
  RootStyle,
  NodeDetailComponent,
  NodeCommonResult,
  FlowType,
  SingleNodeDebuggingProps,
  RefInput,
  UploadFileItem,
  VersionManagementProps,
  VersionItem,
  PublicResultItem,
  FeedbackItem,
  TabType,
  AddNodeType,
  ToolType,
  PositionType,
  NewNodeType,
  IFlyCollectorType,
  UseChatDebuggerContentProps,
} from './chat-debugger';

// Chat Debugger 相关类型
export type { UseChatContentProps } from './chat-debugger';

// Code IDEA 相关类型
export type { useAICodeInputBoxProps } from './code-idea';

export interface UseVersionManagementProps {
  handleCardClick: (cardId: string) => void;
  handleViewDetail: (detailItem: FeedbackItem) => void;
  handlePublicResult: () => void;
  handlegetRestoreVersion: () => void;
  queryFeedbackList: (flowId: string) => void;
}
