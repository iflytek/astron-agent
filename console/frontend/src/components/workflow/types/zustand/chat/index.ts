import type { KeyboardEvent } from 'react';
import type { StoreApi } from 'zustand';
import type {
  ChatInfoType,
  ChatListItem,
  InterruptChatType,
  StartNodeType,
} from '../../drawer/chat-debugger';
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowSnapshot,
} from '../../domain';

export type ChatUpdate<Value> = Value | ((previous: Value) => Value);

export interface ChatState {
  userInput: string;
  chatList: ChatListItem[];
  chatInfoRef: ChatInfoType;
  messageNodeTextQueue: string;
  endNodeReasoningTextQueue: string;
  endNodeTextQueue: string;
  wsMessageStatus: string;
  preRunningNodeIds: string[];
  currentFollowNodeId: string;
  versionId: string;
  chatType: string;
  startNodeParams: StartNodeType[];
  buildPassRef: boolean;
  debuggering: boolean;
  interruptChat: InterruptChatType;
  suggestLoading: boolean;
  suggestProblem: string[];
  userWheel: boolean;
  deleteAllModal: boolean;
  chatIdRef: string;
  runId: string;
  runStatus: string;
  stopRequested: boolean;
  controllerRef?: AbortController;
}

export interface ChatStoreType extends ChatState {
  setChatList: (update: ChatUpdate<ChatListItem[]>) => void;
  setStartNodeParams: (update: ChatUpdate<StartNodeType[]>) => void;
  setInterruptChat: (update: ChatUpdate<InterruptChatType>) => void;
  setSuggestLoading: (update: ChatUpdate<boolean>) => void;
  setSuggestProblem: (update: ChatUpdate<string[]>) => void;
  setUserWheel: (update: ChatUpdate<boolean>) => void;
  setDebuggering: (update: ChatUpdate<boolean>) => void;
  setDeleteAllModal: (update: ChatUpdate<boolean>) => void;
  handleChatTypeChange: (type: string) => void;
  getDialogues: (id: string, shouldAddDivider?: boolean) => void;
  clearNodeStatus: () => void;
  handleSaveDialogue: () => void;
  handleResumeChat: (content?: string) => void;
  handleRunDebugger: (
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    inputs?: StartNodeType[],
    regen?: boolean
  ) => void;
  clearData: (setOpen: (open: boolean) => void) => void;
  handleEnterKey: (event: KeyboardEvent<HTMLElement>) => void;
  handleStopConversation: () => void;
  deleteAllChat: () => void;
  canRunDebugger: () => boolean;
  setWsMessageStatus: (status: string) => void;
  resetNodesAndEdges: () => WorkflowSnapshot;
  setQueue: (length: number) => void;
  setUserInput: (value: string) => void;
  getTextQueueContent: () => string;
  isChatEnd: () => boolean;
  getChatKey: () => 'messageContent' | 'reasoningContent' | 'content';
}

export type ChatGetter = () => ChatStoreType;
export type ChatSetter = StoreApi<ChatStoreType>['setState'];
