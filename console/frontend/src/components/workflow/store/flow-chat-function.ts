import type { EventSourceMessage } from '@microsoft/fetch-event-source';
import type { WorkflowNode, WorkflowEdge } from '../types/domain';
import type {
  ResponseResult,
  ResumeChatParams,
  WorkflowChatParams,
  ChatDebuggerAdvancedConfig,
  BuildFlowParams,
} from '../types';
import type {
  ChatGetter,
  ChatSetter,
  ChatState,
  ChatStoreType,
} from '../types/zustand/chat';
import React from 'react';
import { ChatListItem } from '../types';

import {
  getDialogueAPI,
  saveDialogueAPI,
  getInputsType,
  addComparisons,
  buildFlowAPI,
  workflowDialogClear,
  workflowDeleteComparisons,
} from '@/services/flow';
import { nextQuestionAdvice } from '@/services/common';
import { v4 as uuid } from 'uuid';
import { moveToPosition } from './flow-function';
import {
  ChatInfoType,
  WebSocketMessageData,
  StartNodeType,
  InterruptChatType,
} from '../types';
import {
  generateDefaultInput,
  generateInputsAndOutputsOrder,
} from '../utils/reactflowUtils';
import useFlowsManager from './use-flows-manager';
import useFlowStore from './use-flow-store';
import { isJSON } from '@/utils';
import i18n from 'i18next';
import { cloneDeep } from 'lodash';
import { getFixedUrl } from '@/components/workflow/utils';
import {
  createWorkflowSseLifecycle,
  isTerminalWorkflowSseErrorFrame,
  throwFatalWorkflowSseError,
  type WorkflowSseLifecycle,
} from './workflow-sse';
import { fetchSseWithContext } from '@/utils/sse-request';
import { getLanguageCode } from '@/utils/http';
import useSpaceStore from '@/store/space-store';

interface NodeStatusOptions {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  nodeId?: string;
  nodeStatus?: string | null;
  responseResult: ResponseResult;
  get: ChatGetter;
}

interface RunDebuggerOptions {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  get: ChatGetter;
  set: ChatSetter;
  enters?: StartNodeType[];
  regen?: boolean;
}

const initInterruptChat: InterruptChatType = {
  eventId: '',
  interrupt: false,
  nodeId: '',
  type: '',
  option: null,
  needReply: true,
};

const initChatInfo: ChatInfoType = {
  question: [],
  answer: {
    messageContent: '',
    reasoningContent: '',
    content: '',
  },
  answerItem: '',
  option: null,
};

export const initialStatus: ChatState = {
  userInput: '',
  chatList: [],
  chatInfoRef: cloneDeep(initChatInfo),
  messageNodeTextQueue: '',
  endNodeReasoningTextQueue: '',
  endNodeTextQueue: '',
  wsMessageStatus: '',
  preRunningNodeIds: [],
  currentFollowNodeId: '',
  versionId: '',
  chatType: 'text',
  startNodeParams: [],
  buildPassRef: false,
  debuggering: false,
  interruptChat: initInterruptChat,
  suggestLoading: false,
  suggestProblem: [],
  userWheel: false,
  deleteAllModal: false,
  chatIdRef: uuid().replace(/-/g, ''),
};

const getWorkflowSseContext = () => {
  const { spaceId, spaceType, enterpriseId } = useSpaceStore.getState();
  return {
    languageCode: getLanguageCode(),
    accessToken: localStorage.getItem('accessToken'),
    spaceId,
    spaceType,
    enterpriseId,
  };
};

export const handleChatTypeChange = (type: string, set: ChatSetter): void => {
  set({
    chatType: type,
  });
};

const getDialogues = (
  id: string,
  set: ChatSetter,
  shouldAddDivider = false
): void => {
  getDialogueAPI(id, 1).then(data => {
    const chatList: ChatListItem[] = [];
    let chatId = data?.[0]?.chatId || null;
    data?.forEach(chat => {
      const currentChatId = chat?.chatId;
      if (currentChatId !== chatId) {
        chatList.unshift({
          id: uuid(),
          type: 'divider',
        });
      }

      chatList.unshift({
        ...chat,
        id: chat?.id,
        type: 'answer',
        messageContent: JSON.parse(chat?.answer)?.messageContent || '',
        reasoningContent: JSON.parse(chat?.answer)?.reasoningContent || '',
        content: JSON.parse(chat?.answer)?.content || '',
        option: JSON.parse(chat?.answer)?.option,
      });
      chatList.unshift({
        ...chat,
        id: uuid(),
        type: 'ask',
        inputs: JSON.parse(chat?.question),
      });
      chatId = currentChatId;
    });
    if (shouldAddDivider && data.length !== 0) {
      chatList.push({
        id: uuid(),
        type: 'divider',
      });
    }
    set({
      chatList,
    });
  });
};
const handleMoveToPosition = (
  id: string | undefined,
  nodes: WorkflowNode[]
): void => {
  const currentNode = nodes.find((node: WorkflowNode) => node.id === id);
  const zoom = 0.8;
  const xPos = currentNode?.position?.x || 0;
  const yPos = currentNode?.position?.y || 0;
  moveToPosition({ x: -xPos * zoom + 200, y: -yPos * zoom + 200, zoom });
};
const pushAskToChatList = (
  inputs: StartNodeType[] | undefined,
  nodes: WorkflowNode[],
  nodeId: string | undefined,
  get: ChatGetter
): void => {
  get().setChatList(chatList => {
    const newInputs = cloneDeep(inputs) || cloneDeep(get().startNodeParams);
    const askParams: ChatListItem = {
      id: uuid(),
      type: 'ask',
      inputs: newInputs,
    };
    get().chatInfoRef.question = newInputs;
    chatList.push(askParams);
    return [...chatList];
  });
  handleMoveToPosition(nodeId, nodes);
};
const pushAnswerToChatList = (get: ChatGetter): void => {
  get().setChatList(chatList => {
    const answerParams: ChatListItem = {
      id: uuid(),
      type: 'answer',
      messageContent: '',
      content: '',
      reasoningContent: '',
    };
    chatList.push(answerParams);
    return [...chatList];
  });
};
const pushContentToAnswer = (
  key:
    | 'messageNodeTextQueue'
    | 'endNodeReasoningTextQueue'
    | 'endNodeTextQueue',
  content: string | undefined,
  get: ChatGetter
): void => {
  get()[key] = get()[key] + (content ?? '');
};
const clearNodeStatus = (get: ChatGetter): void => {
  if (get().userInput) {
    get().setUserInput('');
  }
  get().setStartNodeParams(startNodeParams =>
    startNodeParams?.map(input => ({
      ...input,
      errorMsg: input?.originErrorMsg,
      default: input?.fileType
        ? []
        : input?.type === 'object'
          ? '{}'
          : input?.type?.includes('array')
            ? '[]'
            : generateDefaultInput(input?.type),
    }))
  );
};
const handleSaveDialogue = (get: ChatGetter, set: ChatSetter): void => {
  const currentFlow = useFlowsManager.getState().currentFlow;
  const params = {
    chatId: get().chatIdRef,
    type: 1,
    workflowId: currentFlow?.id,
    sid: get().chatInfoRef?.sid,
    questionItem: JSON.stringify(get().chatInfoRef?.question),
    answerItem: JSON.stringify(get().chatInfoRef?.answerItem),
    question: JSON.stringify(get().chatInfoRef?.question),
    answer: JSON.stringify(get().chatInfoRef?.answer),
  };
  saveDialogueAPI(params).then(
    () => currentFlow?.id && getDialogues(currentFlow.id, set)
  );
  get().chatInfoRef = cloneDeep(initChatInfo);
};
const handleAuditFailed = (
  data: WebSocketMessageData,
  get: ChatGetter
): void => {
  get().messageNodeTextQueue = '';
  get().endNodeReasoningTextQueue = '';
  get().endNodeTextQueue = '';
  get().setChatList(chatList => {
    get().chatInfoRef.answer = {
      messageContent: '',
      reasoningContent: '',
      content: data.message ?? '',
    };
    const answer = chatList[chatList.length - 1];
    if (answer) {
      answer.messageContent = '';
      answer.reasoningContent = '';
      answer.content = data.message;
    }
    return [...chatList];
  });
  handleMessageEnd(data, get);
};
const handleInterrupt = ({
  data,
  nodes,
  edges,
  nodeId,
  nodeStatus,
  responseResult,
  get,
}: NodeStatusOptions & { data: WebSocketMessageData }): void => {
  const content = data?.['event_data']?.value?.content;
  handleNodeStatusChange({
    nodes,
    edges,
    nodeId,
    nodeStatus,
    responseResult,
    get,
  });
  pushContentToAnswer('endNodeTextQueue', content, get);
  get().wsMessageStatus = 'end';
  get().setInterruptChat({
    interrupt: true,
    eventId: data?.['event_data']?.event_id || '',
    nodeId: nodeId || '',
    option:
      data?.['event_data']?.value?.option?.filter(
        item => item.id !== 'default'
      ) || null,
    type: data?.['event_data']?.value?.type || '',
    needReply: data?.['event_data']?.need_reply || false,
  });
  get().chatInfoRef.answer.option = data?.['event_data']?.value?.option?.filter(
    item => item.id !== 'default'
  );
};
const handleFlowStop = (data: WebSocketMessageData, get: ChatGetter): void => {
  if (data.code !== 0) {
    pushContentToAnswer('endNodeTextQueue', data?.message, get);
  }
  handleMessageEnd(data, get);
};
const extractNodeInfo = (data: WebSocketMessageData) => {
  const flowResult = data.choices?.[0]?.['finish_reason'];
  const node = data?.['workflow_step']?.node;
  const nodeId = node?.id;
  const nodeStatus = node?.['finish_reason'];
  const content = data.choices?.[0]?.delta?.content;
  const responseResult: ResponseResult = {
    timeCost: node?.['executed_time'],
    tokenCost: node?.usage?.['total_tokens'],
    inputs: node?.inputs,
    outputs: node?.outputs,
    errorOutputs: node?.['error_outputs'],
    rawOutput: node?.ext?.['raw_output'],
    nodeAnswerContent: content,
    reasoningContent: data?.choices?.[0]?.delta?.['reasoning_content'] || '',
    status: data?.code === 0 ? 'success' : 'failed',
    failedReason: data?.message,
    answerMode: node?.id?.startsWith('message')
      ? 1
      : node?.ext?.['answer_mode'],
  };
  return {
    flowResult,
    nodeId,
    nodeStatus,
    responseResult,
  };
};
const handleAnswerContent = (
  nodeId: string | undefined,
  responseResult: ResponseResult,
  get: ChatGetter
): void => {
  if (nodeId?.startsWith('node-end') && responseResult?.reasoningContent) {
    pushContentToAnswer(
      'endNodeReasoningTextQueue',
      responseResult?.reasoningContent,
      get
    );
  }
  if (nodeId?.startsWith('message')) {
    pushContentToAnswer(
      'messageNodeTextQueue',
      responseResult?.nodeAnswerContent,
      get
    );
  }
  if (nodeId?.startsWith('node-end')) {
    pushContentToAnswer(
      'endNodeTextQueue',
      responseResult?.nodeAnswerContent,
      get
    );
  }
};
const updateAnswerItem = (
  nodeId: string | undefined,
  responseResult: ResponseResult,
  get: ChatGetter
): void => {
  if (nodeId?.startsWith('node-end') || nodeId?.startsWith('message')) {
    get().chatInfoRef.answerItem =
      get().chatInfoRef.answerItem + responseResult?.nodeAnswerContent;
  }
};
const handleRunningNode = (
  currentNode: WorkflowNode,
  responseResult: ResponseResult,
  get: ChatGetter
): void => {
  currentNode.data.status = 'running';
  const beforeContent = currentNode?.data?.debuggerResult?.done
    ? ''
    : (currentNode?.data?.debuggerResult?.answerContent ?? '');
  const beforeReasoningContent = currentNode?.data?.debuggerResult?.done
    ? ''
    : (currentNode?.data?.debuggerResult?.reasoningContent ?? '');
  currentNode.data.debuggerResult = {
    answerMode: responseResult?.answerMode,
    answerContent: beforeContent + responseResult?.nodeAnswerContent,
    reasoningContent: beforeReasoningContent + responseResult?.reasoningContent,
    done: false,
  };
};
const handleFinishedNode = (
  nodeId: string | undefined,
  currentNode: WorkflowNode,
  responseResult: ResponseResult,
  get: ChatGetter
): void => {
  const beforeContent = currentNode?.data?.debuggerResult?.answerContent ?? '';
  const beforeReasoningContent =
    currentNode?.data?.debuggerResult?.reasoningContent ?? '';
  currentNode.data.debuggerResult = {
    timeCost: responseResult?.timeCost || undefined,
    tokenCost: responseResult.tokenCost || undefined,
    input: generateInputsAndOutputsOrder(
      currentNode,
      responseResult.inputs ?? {},
      'inputs'
    ),
    rawOutput: responseResult?.rawOutput,
    output: generateInputsAndOutputsOrder(
      currentNode,
      responseResult.outputs ?? {},
      'outputs'
    ),
    errorOutputs: responseResult?.errorOutputs,
    failedReason: '',
    answerContent: beforeContent + responseResult?.nodeAnswerContent,
    reasoningContent: beforeReasoningContent + responseResult?.reasoningContent,
    answerMode: responseResult?.answerMode,
    done: true,
  };
  if (responseResult.status === 'success') {
    currentNode.data.status = 'success';
  } else {
    currentNode.data.status = 'failed';
    currentNode.data.debuggerResult.failedReason = responseResult?.failedReason;
  }
  if (nodeId?.startsWith('node-end') && responseResult?.answerMode === 0) {
    pushContentToAnswer(
      'endNodeTextQueue',
      JSON.stringify(responseResult?.outputs),
      get
    );
    get().chatInfoRef.answerItem = JSON.stringify(responseResult.outputs ?? {});
  }
  if (nodeId?.startsWith('message')) {
    pushContentToAnswer('messageNodeTextQueue', '\n', get);
  }
};
const handleNodeStatusChange = ({
  nodes,
  edges,
  nodeId,
  nodeStatus,
  responseResult,
  get,
}: NodeStatusOptions): void => {
  const setEdges = useFlowStore.getState().setEdges;
  const setNode = useFlowStore.getState().setNode;
  const currentNode = nodes.find(node => node.id === nodeId);
  if (!currentNode) return;
  const autonomousMode = useFlowsManager.getState().autonomousMode;
  handleAnswerContent(nodeId, responseResult, get);
  updateAnswerItem(nodeId, responseResult, get);
  if (nodeStatus === 'ing' || nodeStatus === 'interrupt') {
    handleRunningNode(currentNode, responseResult, get);
  } else {
    handleFinishedNode(nodeId, currentNode, responseResult, get);
  }
  if (get().preRunningNodeIds?.length > 0) {
    const sourceNodesId = edges
      ?.filter(edge => edge?.target === currentNode?.id)
      ?.map(edge => edge?.source);
    const set2 = new Set(sourceNodesId);
    const intersectionIds = get().preRunningNodeIds.filter(value =>
      set2.has(value)
    );
    setEdges(edges => {
      edges.forEach(edge => {
        if (
          edge.target === currentNode?.id &&
          intersectionIds?.includes(edge.source)
        ) {
          edge.animated = true;
          edge.style = {
            stroke: '#6356EA',
            strokeWidth: 2,
            strokeDasharray: '5 5',
          };
        }
      });
      return cloneDeep(edges);
    });
  }
  setNode(currentNode.id, cloneDeep(currentNode));
  get().preRunningNodeIds.push(currentNode?.id);
  //跟随模式下需要根据节点移动画布
  if (currentNode?.id?.startsWith('node-start')) {
    get().currentFollowNodeId = currentNode?.id;
  }
  if (!autonomousMode) {
    const shouldMoveNode = edges?.some(
      edge =>
        edge?.source === get().currentFollowNodeId &&
        edge?.target === currentNode?.id
    );
    if (shouldMoveNode && currentNode?.id) {
      handleMoveToPosition(currentNode?.id, nodes);
      get().currentFollowNodeId = currentNode?.id;
    }
  }
};
const handleMessage = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  e: EventSourceMessage,
  get: ChatGetter,
  set: ChatSetter
): void => {
  if (!e.data || !isJSON(e.data)) return;
  const data: WebSocketMessageData = JSON.parse(e.data);
  const { flowResult, nodeId, nodeStatus, responseResult } =
    extractNodeInfo(data);
  get().chatInfoRef.sid = data?.id;
  if (data?.code === 21103) {
    handleAuditFailed(data, get);
    return;
  } else if (
    isTerminalWorkflowSseErrorFrame(data as unknown as Record<string, unknown>)
  ) {
    handleFlowStop(data, get);
    return;
  } else if (flowResult === null && nodeId !== 'flow_obj') {
    handleNodeStatusChange({
      nodes,
      edges,
      nodeId,
      nodeStatus: nodeStatus === null ? 'ing' : nodeStatus,
      responseResult,
      get,
    });
  } else if (flowResult === 'interrupt') {
    handleInterrupt({
      data,
      nodes,
      edges,
      nodeId,
      nodeStatus,
      responseResult,
      get,
    });
  } else if (flowResult === 'stop') {
    handleFlowStop(data, get);
  }
};
const handleRunningNodeStatus = (): void => {
  const setNodes = useFlowStore.getState().setNodes;
  setNodes(nodes => {
    nodes.forEach(node => {
      if (node?.data?.status === 'running') {
        (node.data.debuggerResult ??= {}).cancelReason = i18n.t(
          'workflow.nodes.chatDebugger.workflowTerminated'
        );
        node.data.status = 'cancel';
      }
    });
    return cloneDeep(nodes);
  });
};
const handleSynchronizeDataToXfyun = (): void => {
  const currentFlow = useFlowsManager.getState().currentFlow;
  const extension = currentFlow?.ext;
  if (!extension || !isJSON(extension)) return;
  const parsed: unknown = JSON.parse(extension);
  if (typeof parsed !== 'object' || parsed === null || !('botId' in parsed))
    return;
  const botId = parsed.botId;
  if (typeof botId !== 'string' && typeof botId !== 'number') return;
  const params = {
    botId,
  };
  getInputsType(params);
};
const handleMessageEnd = (
  data: WebSocketMessageData,
  get: ChatGetter
): void => {
  const setShowNodeList = useFlowsManager.getState().setShowNodeList;
  const setFlowResult = useFlowsManager.getState().setFlowResult;
  const setCanvasesDisabled = useFlowsManager.getState().setCanvasesDisabled;
  const historyVersion = useFlowsManager.getState().historyVersion;
  const setEdges = useFlowStore.getState().setEdges;
  const flowResult = {
    status: data.code === 0 ? 'success' : 'failed',
    timeCost: (data?.executedTime || 0).toString(),
    totalTokens: (data?.usage?.['total_tokens'] || 0).toString(),
  };
  get().wsMessageStatus = 'end';
  setShowNodeList(true);
  setFlowResult(flowResult);
  setEdges(edges =>
    edges?.map(edge => ({
      ...edge,
      animated: false,
      style: {
        stroke: '#6356EA',
        strokeWidth: 2,
      },
    }))
  );
  !historyVersion && setCanvasesDisabled(false);
  get().setInterruptChat({ ...initInterruptChat });
  handleRunningNodeStatus();
};
const createActiveWorkflowSseLifecycle = (
  controller: AbortController,
  get: ChatGetter,
  handleSseMessage: (event: EventSourceMessage) => boolean
): WorkflowSseLifecycle<EventSourceMessage> =>
  createWorkflowSseLifecycle({
    isCurrent: () => get().controllerRef === controller,
    finalize: () =>
      handleFlowStop(
        {
          code: -1,
          message: i18n.t(
            'workflow.nodes.chatDebugger.workflowConnectionInterrupted'
          ),
        },
        get
      ),
    handleMessage: handleSseMessage,
    onTransportError: error =>
      console.error('[Workflow SSE] Request failed', error),
  });
const handleResumeChat = (
  content: string | undefined,
  get: ChatGetter,
  set: ChatSetter
): void => {
  const currentFlow = useFlowsManager.getState().currentFlow;
  const nodes = useFlowStore.getState().nodes;
  const edges = useFlowStore.getState().edges;
  get().controllerRef?.abort();
  const controller = new AbortController();
  set({
    wsMessageStatus: 'start',
    debuggering: true,
    controllerRef: controller,
  });
  pushAskToChatList(
    [
      {
        name: 'AGENT_USER_INPUT',
        type: 'string',
        default:
          content || i18n.t('workflow.nodes.chatDebugger.userIgnoredQuestion'),
        description: i18n.t(
          'workflow.nodes.chatDebugger.userCurrentRoundInput'
        ),
        required: true,
        validationSchema: null,
        errorMsg: '',
        originErrorMsg: '',
      },
    ],
    nodes,
    get().interruptChat?.nodeId,
    get
  );
  pushAnswerToChatList(get);
  const url = getFixedUrl('/workflow/resume');
  const params: ResumeChatParams = {
    flow_id: currentFlow?.flowId,
    eventId: get().interruptChat?.eventId,
    eventType: content ? 'resume' : 'ignore',
    content,
  };
  if (get().versionId) {
    params.version = get().versionId;
    params.promptDebugger = true;
  }
  const sseLifecycle = createActiveWorkflowSseLifecycle(
    controller,
    get,
    event => {
      handleMessage(nodes, edges, event, get, set);
      return get().wsMessageStatus === 'end';
    }
  );
  void fetchSseWithContext(url, {
    getContext: getWorkflowSseContext,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: controller.signal,
    openWhenHidden: true,
    onerror(error) {
      sseLifecycle.onError(error);
    },
    onclose() {
      sseLifecycle.onClose();
    },
    onmessage(e) {
      sseLifecycle.onMessage(e);
    },
  }).catch(() => undefined);
  clearNodeStatus(get);
};
const runDebugger = (obj: RunDebuggerOptions): void => {
  const { nodes, edges, get, set, enters, regen = false } = obj;
  const currentFlow = useFlowsManager.getState().currentFlow;
  const historyVersion = useFlowsManager.getState().historyVersion;
  const url = getFixedUrl('/workflow/chat');
  get().controllerRef?.abort();
  const controller = new AbortController();
  set({
    controllerRef: controller,
  });
  const inputs: Record<string, unknown> = {};
  const enterlist = enters ?? get().startNodeParams;
  enterlist.forEach(params => {
    if (
      params.type === 'object' ||
      (!params.fileType && params.type.includes('array'))
    ) {
      inputs[params.name] =
        isJSON(params.default as string) &&
        JSON.parse(params.default as string);
    } else if (params.fileType && params.type === 'string') {
      const first = Array.isArray(params.default)
        ? params.default[0]
        : undefined;
      inputs[params.name] =
        typeof first === 'object' && first !== null ? first.url : undefined;
    } else if (params.fileType && params.type === 'array-string') {
      inputs[params.name] = Array.isArray(params.default)
        ? params.default.flatMap(item =>
            typeof item === 'object' && item !== null ? [item.url] : []
          )
        : [];
    } else {
      inputs[params.name] = params.default;
    }
  });
  const params: WorkflowChatParams = {
    flow_id: currentFlow?.flowId,
    inputs: inputs,
    chatId: get().chatIdRef,
    regen,
  };
  if (historyVersion) {
    params.version = get().versionId;
    params.promptDebugger = true;
  }
  const sseLifecycle = createActiveWorkflowSseLifecycle(
    controller,
    get,
    event => {
      handleMessage(nodes, edges, event, get, set);
      return get().wsMessageStatus === 'end';
    }
  );
  void fetchSseWithContext(url, {
    getContext: getWorkflowSseContext,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: controller.signal,
    openWhenHidden: true,
    onerror(error) {
      sseLifecycle.onError(error);
    },
    onclose() {
      sseLifecycle.onClose();
    },
    onmessage(e) {
      sseLifecycle.onMessage(e);
    },
  }).catch(() => undefined);
  clearNodeStatus(get);
};
const advancedConfig = (): ChatDebuggerAdvancedConfig => {
  const currentFlow = useFlowsManager.getState().currentFlow;
  if (currentFlow?.advancedConfig && isJSON(currentFlow?.advancedConfig)) {
    const parsedConfig = JSON.parse(currentFlow?.advancedConfig);
    return {
      suggestedQuestionsAfterAnswer: {
        enabled: parsedConfig?.suggestedQuestionsAfterAnswer?.enabled ?? true,
      },
    };
  } else {
    return {
      suggestedQuestionsAfterAnswer: {
        enabled: true,
      },
    };
  }
};
const handleRunDebugger = ({
  nodes,
  edges,
  get,
  set,
  inputs,
  regen = false,
}: RunDebuggerOptions & { inputs?: StartNodeType[] }): void => {
  const currentFlow = useFlowsManager.getState().currentFlow;
  const setCanPublish = useFlowsManager.getState().setCanPublish;
  const setShowNodeList = useFlowsManager.getState().setShowNodeList;
  const setFlowResult = useFlowsManager.getState().setFlowResult;
  const historyVersion = useFlowsManager.getState().historyVersion;
  const setCanvasesDisabled = useFlowsManager.getState().setCanvasesDisabled;
  const suggestedQuestion =
    inputs?.[0]?.default ?? get().startNodeParams[0]?.default;
  if (
    typeof suggestedQuestion === 'string' &&
    advancedConfig()?.suggestedQuestionsAfterAnswer?.enabled &&
    get().startNodeParams?.length === 1
  ) {
    get().setSuggestLoading(true);
    nextQuestionAdvice({
      question: suggestedQuestion,
    })
      .then(data => {
        get().setSuggestProblem(() => data);
      })
      .finally(() => get().setSuggestLoading(false));
  } else {
    get().setSuggestProblem(() => []);
  }
  get().buildPassRef = false;
  let params: BuildFlowParams;
  let api: (params: BuildFlowParams) => Promise<unknown>;
  if (useFlowsManager.getState().historyVersion) {
    get().versionId = uuid();
    params = {
      flowId: currentFlow?.flowId,
      name: currentFlow?.name,
      data: {
        nodes: nodes?.map(({ nodeType, ...reset }) => ({
          ...reset,
          data: {
            ...reset?.data,
            updatable: false,
          },
        })),
        edges: edges?.map(({ style, animated, ...reset }) => reset),
      },
      version: get().versionId,
    };
    api = addComparisons;
  } else {
    params = {
      id: currentFlow?.id,
      flowId: currentFlow?.flowId,
      name: currentFlow?.name,
      description: currentFlow?.description,
      data: {
        nodes: nodes?.map(({ nodeType, ...reset }) => {
          const node = {
            ...reset,
            data: {
              ...reset?.data,
              updatable: false,
            },
          };
          Reflect.deleteProperty(node.data, 'debuggerResult');
          return node;
        }),
        edges: edges?.map(({ style, animated, ...reset }) => reset),
      },
    };
    api = buildFlowAPI;
  }
  api(params).then(() => {
    setCanPublish(true);
    setShowNodeList(false);
    set({
      preRunningNodeIds: [],
      buildPassRef: true,
      userWheel: false,
    });
    setFlowResult({
      status: 'running',
      timeCost: '',
      totalTokens: '',
    });
    const nodeId = nodes?.find(node => node?.nodeType === 'node-start')?.id;
    pushAskToChatList(inputs, nodes, nodeId, get);
    !historyVersion && setCanvasesDisabled(true);
    pushAnswerToChatList(get);
    runDebugger({
      nodes,
      edges,
      get,
      set,
      enters: inputs,
      regen,
    });
    //同步数据到开放平台
    handleSynchronizeDataToXfyun();
  });
};
const clearData = (setOpen: (open: boolean) => void, get: ChatGetter): void => {
  const setFlowResult = useFlowsManager.getState().setFlowResult;
  const setShowNodeList = useFlowsManager.getState().setShowNodeList;
  const setCanvasesDisabled = useFlowsManager.getState().setCanvasesDisabled;
  get().preRunningNodeIds = [];
  get().setStartNodeParams([]);
  if (get().userInput) {
    get().setUserInput('');
  }
  setOpen(false);
  if (get().debuggering) {
    setFlowResult({
      status: '',
      timeCost: '',
      totalTokens: '',
    });
  }
  setShowNodeList(true);
  setCanvasesDisabled(false);
};

const canRunDebugger = (get: ChatGetter): boolean => {
  if (!get().debuggering && get().interruptChat?.type === 'option')
    return false;
  if (
    !get().debuggering &&
    get().startNodeParams?.length > 1 &&
    get().startNodeParams.every((params: StartNodeType) => {
      if (params?.required) {
        if (params.errorMsg) {
          return false;
        } else if (params.fileType) {
          return (
            Array.isArray(params.default) &&
            params.default.length > 0 &&
            params.default.every(
              item =>
                typeof item === 'object' &&
                item !== null &&
                !item.loading &&
                Boolean(item.url)
            )
          );
        } else if (params.type === 'object' || params.type.includes('array')) {
          return (
            typeof params.default === 'string' &&
            Boolean(isJSON(params.default))
          );
        } else if (params.type === 'string') {
          return (
            typeof params.default === 'string' && Boolean(params.default.trim())
          );
        } else if (params.type === 'boolean') {
          return typeof params?.default === 'boolean';
        } else {
          return typeof params?.default !== 'string';
        }
      } else if (params.fileType) {
        return (
          Array.isArray(params.default) &&
          params.default.every(
            item => typeof item === 'object' && item !== null && !item.loading
          )
        );
      } else {
        return true;
      }
    })
  ) {
    return true;
  }
  if (
    !get().debuggering &&
    get().startNodeParams?.length === 1 &&
    get().userInput?.trim()
  ) {
    return true;
  }
  return false;
};

const handleEnterKey = (
  e: React.KeyboardEvent<HTMLElement>,
  get: ChatGetter,
  set: ChatSetter
): void => {
  e.stopPropagation();
  if (
    e.nativeEvent.keyCode === 13 &&
    !e.nativeEvent.shiftKey &&
    canRunDebugger(get)
  ) {
    e.preventDefault();
    if (get().interruptChat?.interrupt) {
      handleResumeChat(get().userInput, get, set);
    } else {
      const { nodes, edges } = resetNodesAndEdges(get);
      handleRunDebugger({
        nodes,
        edges,
        get,
        set,
        inputs: [
          {
            name: 'AGENT_USER_INPUT',
            type: 'string',
            default: get().userInput,
            description: i18n.t(
              'workflow.nodes.chatDebugger.userCurrentRoundInput'
            ),
            required: true,
            validationSchema: null,
            errorMsg: '',
            originErrorMsg: '',
          },
        ],
      });
    }
  } else if (e.nativeEvent.keyCode === 13 && !e.nativeEvent.shiftKey) {
    e.preventDefault();
  } else if (e.key === 'Tab') {
    get().setUserInput(get().userInput + '\t');
    get().setStartNodeParams(startNodeParams => {
      const first = startNodeParams[0];
      if (first && typeof first.default === 'string') first.default += '\t';
      return [...startNodeParams];
    });
    e.preventDefault();
  }
};

const resetNodesAndEdges = (
  get: ChatGetter
): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} => {
  const nodes = useFlowStore.getState().nodes;
  const edges = useFlowStore.getState().edges;
  const setNodes = useFlowStore.getState().setNodes;
  get().wsMessageStatus = 'start';
  get().setDebuggering(true);
  const newNodes = cloneDeep(nodes);
  newNodes.forEach(node => {
    node.data.status = '';
    node.data.debuggerResult = {};
  });
  setNodes(newNodes);
  return {
    nodes: newNodes,
    edges: edges,
  };
};

const handleStopConversation = (get: ChatGetter): void => {
  const currentFlow = useFlowsManager.getState().currentFlow;
  const setCanvasesDisabled = useFlowsManager.getState().setCanvasesDisabled;
  const historyVersion = useFlowsManager.getState().historyVersion;
  const setShowNodeList = useFlowsManager.getState().setShowNodeList;
  const setEdges = useFlowStore.getState().setEdges;
  const setFlowResult = useFlowsManager.getState().setFlowResult;
  get().chatIdRef = uuid().replace(/-/g, '');
  if (get().interruptChat?.interrupt) {
    const url = getFixedUrl('/workflow/resume');
    const params = {
      flow_id: currentFlow?.flowId,
      eventId: get().interruptChat?.eventId,
      eventType: 'abort',
    };
    void fetchSseWithContext(url, {
      getContext: getWorkflowSseContext,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      openWhenHidden: true,
      onerror(error) {
        throwFatalWorkflowSseError(error);
      },
    }).catch(error =>
      console.error('[Workflow SSE] Abort request failed', error)
    );
  }
  get().setChatList(chatList => [
    ...chatList,
    {
      id: uuid(),
      type: 'divider',
    },
  ]);
  get().setInterruptChat({ ...initInterruptChat });
  !historyVersion && setCanvasesDisabled(false);
  setShowNodeList(true);
  setEdges(edges =>
    edges?.map(edge => ({
      ...edge,
      animated: false,
      style: {
        stroke: '#6356EA',
        strokeWidth: 2,
      },
    }))
  );
  setFlowResult({
    status: '',
    timeCost: '',
    totalTokens: '',
  });
};

const deleteAllChat = (get: ChatGetter): void => {
  const currentFlow = useFlowsManager.getState().currentFlow;
  const historyVersion = useFlowsManager.getState().historyVersion;
  const setCanvasesDisabled = useFlowsManager.getState().setCanvasesDisabled;
  if (!currentFlow?.id) return;
  workflowDialogClear(currentFlow.id, 1).then(() => {
    get().chatIdRef = uuid().replace(/-/g, '');
    get().setDeleteAllModal(false);
    get().setChatList([]);
    get().setInterruptChat({ ...initInterruptChat });
    !historyVersion && setCanvasesDisabled(false);
  });
};

const handleWorkflowDeleteComparisons = (get: ChatGetter): void => {
  const currentFlow = useFlowsManager.getState().currentFlow;
  if (!get().versionId) return;
  const parmas = {
    flowId: currentFlow?.flowId,
    version: get().versionId,
  };
  workflowDeleteComparisons(parmas);
};

const setChatList = (
  change: Parameters<ChatStoreType['setChatList']>[0],
  get: ChatGetter,
  set: ChatSetter
): void => {
  const newChange =
    typeof change === 'function' ? change(get().chatList) : change;
  set({
    chatList: newChange,
  });
};

const setStartNodeParams = (
  change: Parameters<ChatStoreType['setStartNodeParams']>[0],
  get: ChatGetter,
  set: ChatSetter
): void => {
  const newChange =
    typeof change === 'function' ? change(get().startNodeParams) : change;
  set({
    startNodeParams: newChange,
  });
};

const setInterruptChat = (
  change: Parameters<ChatStoreType['setInterruptChat']>[0],
  get: ChatGetter,
  set: ChatSetter
): void => {
  const newChange =
    typeof change === 'function' ? change(get().interruptChat) : change;
  set({
    interruptChat: newChange,
  });
};

const setSuggestLoading = (
  change: Parameters<ChatStoreType['setSuggestLoading']>[0],
  get: ChatGetter,
  set: ChatSetter
): void => {
  const newChange =
    typeof change === 'function' ? change(get().suggestLoading) : change;
  set({
    suggestLoading: newChange,
  });
};

const setSuggestProblem = (
  change: Parameters<ChatStoreType['setSuggestProblem']>[0],
  get: ChatGetter,
  set: ChatSetter
): void => {
  const newChange =
    typeof change === 'function' ? change(get().suggestProblem) : change;
  set({
    suggestProblem: newChange,
  });
};

const setUserWheel = (
  change: Parameters<ChatStoreType['setUserWheel']>[0],
  get: ChatGetter,
  set: ChatSetter
): void => {
  const newChange =
    typeof change === 'function' ? change(get().userWheel) : change;
  set({
    userWheel: newChange,
  });
};

const setDebuggering = (
  change: Parameters<ChatStoreType['setDebuggering']>[0],
  get: ChatGetter,
  set: ChatSetter
): void => {
  const newChange =
    typeof change === 'function' ? change(get().debuggering) : change;
  set({
    debuggering: newChange,
  });
};

const setDeleteAllModal = (
  change: Parameters<ChatStoreType['setDeleteAllModal']>[0],
  get: ChatGetter,
  set: ChatSetter
): void => {
  const newChange =
    typeof change === 'function' ? change(get().deleteAllModal) : change;
  set({
    deleteAllModal: newChange,
  });
};

const setWsMessageStatus = (status: string, set: ChatSetter): void => {
  set({
    wsMessageStatus: status,
  });
};

const setUserInput = (value: string, set: ChatSetter): void => {
  set({
    userInput: value,
  });
};

const setQueue = (number: number, get: ChatGetter, set: ChatSetter): void => {
  const key = get().messageNodeTextQueue
    ? 'messageNodeTextQueue'
    : get().endNodeReasoningTextQueue
      ? 'endNodeReasoningTextQueue'
      : 'endNodeTextQueue';
  set({
    [key]: get()[key].slice(number),
  });
};

const getTextQueueContent = (get: ChatGetter): string => {
  return (
    get().messageNodeTextQueue ||
    get().endNodeReasoningTextQueue ||
    get().endNodeTextQueue
  );
};

const getChatKey = (
  get: ChatGetter
): ReturnType<ChatStoreType['getChatKey']> => {
  return get().messageNodeTextQueue
    ? 'messageContent'
    : get().endNodeReasoningTextQueue
      ? 'reasoningContent'
      : 'content';
};

const isChatEnd = (get: ChatGetter): boolean => {
  return (
    !get().messageNodeTextQueue &&
    !get().endNodeReasoningTextQueue &&
    !get().endNodeTextQueue &&
    get().wsMessageStatus === 'end'
  );
};

export {
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
  resetNodesAndEdges,
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
  setQueue,
  setUserInput,
  getTextQueueContent,
  isChatEnd,
  getChatKey,
};
