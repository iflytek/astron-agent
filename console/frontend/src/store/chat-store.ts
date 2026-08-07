import { create } from 'zustand';
import type {
  MessageListType,
  ChatState,
  ChatActions,
  Option,
  UploadFileInfo,
} from '@/types/chat';
const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // 状态
  messageList: [],
  chatFileListNoReq: [],
  streamingMessage: null,
  streamId: '',
  answerPercent: 0,
  controllerRef: new AbortController(),
  isLoading: false,
  currentToolName: '',
  traceSource: '',
  deepThinkText: '',
  currentChatId: 0,
  workflowOperation: [],
  isWorkflowOption: false,
  workflowOption: {
    option: [] as Option[],
    content: '',
  },
  chatType: 'text',
  vmsInteractiveRef: null,
  vmsInteractiveRefStatus: '',
  vmsInteractiveRefPlayer: null,
  // 操作
  initChatStore: (): void => {
    set({
      messageList: [],
      chatFileListNoReq: [],
      streamId: '',
      streamingMessage: null,
      answerPercent: 0,
      controllerRef: new AbortController(),
      isLoading: false,
      currentToolName: '',
      traceSource: '',
      deepThinkText: '',
      workflowOperation: [],
      isWorkflowOption: false,
      workflowOption: {
        option: [] as Option[],
        content: '',
      },
    });
  },

  setMessageList: (messageList: MessageListType[]): void =>
    set({ messageList }),
  setChatFileListNoReq: (
    updater: UploadFileInfo[] | ((prev: UploadFileInfo[]) => UploadFileInfo[])
  ): void => {
    set(state => ({
      chatFileListNoReq:
        typeof updater === 'function'
          ? updater(state.chatFileListNoReq)
          : updater,
    }));
  },
  addMessage: (message: MessageListType): void =>
    set(state => {
      return { messageList: [...state.messageList, message] };
    }),

  // 流式消息管理
  startStreamingMessage: (message: MessageListType): void =>
    set(state => ({
      messageList: [...state.messageList, message],
      streamingMessage: null, // 清除单独的streamingMessage
      isLoading: true,
    })),

  updateStreamingMessage: (content: string): void =>
    set(state => {
      if (state.messageList.length === 0) return state;

      const updatedMessageList = [...state.messageList];
      const lastMessage = updatedMessageList[updatedMessageList.length - 1];

      // 只更新最后一条消息（正在流式输出的消息，特征：没有sid）
      if (lastMessage && !lastMessage.sid) {
        updatedMessageList[updatedMessageList.length - 1] = {
          ...lastMessage,
          message: content,
          tools: state.currentToolName ? [state.currentToolName] : [],
          traceSource: state.traceSource,
          reasoning: state.deepThinkText,
        };
        return {
          messageList: updatedMessageList,
        };
      }

      return state;
    }),

  finishStreamingMessage: (sid?: string, reqId?: number): void =>
    set(state => {
      if (state.messageList.length === 0) return state;

      const updatedMessageList = [...state.messageList];
      const lastMessage = updatedMessageList[updatedMessageList.length - 1];

      // 完成流式消息，添加sid和id
      if (lastMessage && !lastMessage.sid) {
        updatedMessageList[updatedMessageList.length - 1] = {
          ...lastMessage,
          message: lastMessage.message || '', // 确保message字段存在
          sid,
          reqId,
          workflowEventData: {
            workflowOperation: state.workflowOperation,
            option: state.workflowOption?.option,
            content: state.workflowOption?.content,
          },
        };

        return {
          messageList: updatedMessageList,
          isLoading: false,
          answerPercent: 0,
          traceSource: '',
          sourceType: '',
          deepThinkText: '',
          currentToolName: '',
          streamId: '',
        };
      }

      return {
        isLoading: false,
        answerPercent: 0,
        traceSource: '',
        deepThinkText: '',
        currentToolName: '',
        streamId: '',
      };
    }),

  clearStreamingMessage: (): void =>
    set(state => {
      const updatedMessageList = [...state.messageList];

      return {
        messageList: updatedMessageList,
        streamingMessage: null,
        isLoading: false,
        answerPercent: 0,
        workflowOperation: [],
        isWorkflowOption: false,
        workflowOption: {
          option: [] as Option[],
          content: '',
        },
      };
    }),
  setStreamId: (streamId: string): void => set({ streamId }),
  setAnswerPercent: (answerPercent: number): void => set({ answerPercent }),
  setControllerRef: (controllerRef: AbortController): void =>
    set({ controllerRef }),
  setIsLoading: (isLoading: boolean): void => set({ isLoading }), //正在加载，未吐字
  setCurrentToolName: (currentToolName: string): void =>
    set({ currentToolName }),
  setTraceSource: (traceSource: string): void => set({ traceSource }),
  setDeepThinkText: (deepThinkText: string): void =>
    set(state => ({ deepThinkText: state.deepThinkText + deepThinkText })),
  setCurrentChatId: (currentChatId: number): void => set({ currentChatId }),
  setWorkflowOperation: (workflowOperation: string[]): void =>
    set({ workflowOperation }),
  setIsWorkflowOption: (isWorkflowOption: boolean): void =>
    set({ isWorkflowOption }),
  setWorkflowOption: (workflowOption: {
    option: Option[];
    content?: string;
  }): void => set({ workflowOption }),
  setVmsInteractiveRef: vmsInteractiveRef => set({ vmsInteractiveRef }),
  setVmsInteractiveRefPlayer: vmsInteractiveRefPlayer =>
    set({ vmsInteractiveRefPlayer }),
  setVmsInteractiveRefStatus: vmsInteractiveRefStatus =>
    set({ vmsInteractiveRefStatus }),
  getVmsInteractiveRefPlayer: () => get().vmsInteractiveRefPlayer,
  getVmsInteractiveRefStatus: () => get().vmsInteractiveRefStatus,
  setChatType: chatType => set({ chatType }),
  getChatType: () => get().chatType,
}));
export default useChatStore;
