import { create } from 'zustand';
import { ReactFlowNode, ReactFlowEdge, ChatStoreType } from '../types';
import {
  initialStatus,
  handleChatTypeChange,
  getDialogues,
  clearNodeStatus,
  handleSaveDialogue,
  handleResumeChat,
  handleRunDebugger,
  clearData,
  handleEnterKey,
  handleStopConversation,
  deleteAllChat,
  handleWorkflowDeleteComparisons,
  setChatList,
  setStartNodeParams,
  setInterruptChat,
  setSuggestLoading,
  setSuggestProblem,
  setUserWheel,
  setDebuggering,
  setDeleteAllModal,
  canRunDebugger,
  setWsMessageStatus,
  resetNodesAndEdges,
  setQueue,
  setUserInput,
  getTextQueueContent,
  isChatEnd,
  getChatKey,
} from './flow-chat-function';

const useChatStore = create<ChatStoreType>((set, get) => ({
  ...initialStatus,
  setChatList: (change): void => setChatList(change, get, set),
  setStartNodeParams: (change): void => setStartNodeParams(change, get, set),
  setInterruptChat: (change): void => setInterruptChat(change, get, set),
  setSuggestLoading: (change): void => setSuggestLoading(change, get, set),
  setSuggestProblem: (change): void => setSuggestProblem(change, get, set),
  setUserWheel: (change): void => setUserWheel(change, get, set),
  setDebuggering: (change): void => setDebuggering(change, get, set),
  setDeleteAllModal: (change): void => setDeleteAllModal(change, get, set),
  handleChatTypeChange: (type: string) => handleChatTypeChange(type, set),
  getDialogues: (id: string, shouldAddDivider = false): void =>
    getDialogues(id, set, shouldAddDivider),
  clearNodeStatus: (): void => clearNodeStatus(get),
  handleSaveDialogue: (): void => handleSaveDialogue(get, set),
  handleResumeChat: (content): void => handleResumeChat(content, get, set),
  handleRunDebugger: (nodes, edges, inputs, regen = false): void =>
    handleRunDebugger({ nodes, edges, get, set, inputs, regen }),
  clearData: (setOpen): void => clearData(setOpen, get),
  handleEnterKey: (e): void => handleEnterKey(e, get, set),
  handleStopConversation: (): void => handleStopConversation(get),
  deleteAllChat: (): void => deleteAllChat(get),
  handleWorkflowDeleteComparisons: (): void =>
    handleWorkflowDeleteComparisons(get),
  canRunDebugger: (): boolean => canRunDebugger(get),
  setWsMessageStatus: (status: string): void => setWsMessageStatus(status, set),
  resetNodesAndEdges: (): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } =>
    resetNodesAndEdges(get),
  setQueue: (number: number): void => setQueue(number, get, set),
  setUserInput: (value: string): void => setUserInput(value, set),
  getTextQueueContent: (): string => getTextQueueContent(get),
  isChatEnd: (): boolean => isChatEnd(get),
  getChatKey: (): string => getChatKey(get),
}));

export default useChatStore;
