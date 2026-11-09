import {
  readHistoryAnswer,
  readHistoryQuestion,
  workflowRetryPath,
} from './workflow-history';
import type { EventSourceMessage } from '@microsoft/fetch-event-source';
import type { WorkflowNode, WorkflowEdge } from '../types/domain';
import type {
  ResponseResult,
  ResumeChatParams,
  WorkflowChatParams,
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
  stopWorkflowRun,
  buildFlowAPI,
  workflowDialogClear,
} from '@/services/flow';
import { message } from 'antd';
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
  readWorkflowFrameStatus,
  stopWorkflowSse,
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
  retryId?: string;
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
  runId: '',
  runStatus: '',
  stopRequested: false,
};

const getWorkflowSseContext = () => {
  const { spaceId, spaceType, enterpriseId } = useSpaceStore.getState();
  return {
    languageCode: getLanguageCode(),
    spaceId,
    spaceType,
    enterpriseId,
  };
};

export const handleChatTypeChange = (type: string, set: ChatSetter) => {
  set({
    chatType: type,
  });
};

let historyGeneration = 0;

const getDialogues = (
  id: string,
  set: ChatSetter,
  shouldAddDivider = false
): void => {
  const generation = ++historyGeneration;
  const manager = useFlowsManager.getState();
  const version = manager.historyVersion
    ? manager.historyVersionData?.versionNum
    : undefined;
  set({ chatList: [] });
  getDialogueAPI(id, 1, version)
    .then(data => {
      if (generation !== historyGeneration) return;
      if (String(useFlowsManager.getState().currentFlow?.id) !== String(id))
        return;
      const current = useFlowsManager.getState();
      if (
        (current.historyVersion
          ? current.historyVersionData?.versionNum
          : undefined) !== version
      )
        return;
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
          messageContent: readHistoryAnswer(chat.answer).messageContent,
          reasoningContent: readHistoryAnswer(chat.answer).reasoningContent,
          content: readHistoryAnswer(chat.answer).content,
          option: readHistoryAnswer(chat.answer)
            .option as ChatListItem['option'],
        });
        chatList.unshift({
          ...chat,
          id: uuid(),
          type: 'ask',
          inputs: readHistoryQuestion(chat.question).map(input => ({
            ...input,
            default: input.default as StartNodeType['default'],
            required: false,
            validationSchema: null,
            errorMsg: '',
            originErrorMsg: '',
          })),
        });
        chatId = currentChatId;
      });
      if (
        shouldAddDivider &&
        data.length !== 0 &&
        !data.some(item => item.status === 'paused')
      ) {
        chatList.push({
          id: uuid(),
          type: 'divider',
        });
      }
      const paused = data.find(
        item => item.status === 'paused' && item.runId && item.eventId
      );
      set({
        chatList,
        ...(paused
          ? {
              runId: paused.runId,
              runStatus: 'paused',
              interruptChat: {
                eventId: paused.eventId || '',
                interrupt: true,
                nodeId: paused.interrupt?.node_id || '',
                type: paused.interrupt?.value?.type || '',
                option: paused.interrupt?.value?.option || null,
                needReply: paused.interrupt?.need_reply ?? true,
              },
            }
          : {
              runId: '',
              runStatus: '',
              interruptChat: { ...initInterruptChat },
            }),
      });
      if (paused) useFlowsManager.getState().setCanvasesDisabled(true);
    })
    .catch(() => message.error('无法读取工作流历史'));
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
  // Execution events and answers are written by the server; the browser only reloads them.
  const currentFlow = useFlowsManager.getState().currentFlow;
  if (currentFlow?.id && !get().interruptChat.interrupt)
    getDialogues(currentFlow.id, set);
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
  const { flowResult, nodeStatus } = readWorkflowFrameStatus(data);
  const node = data?.['workflow_step']?.node;
  const nodeId = node?.id;
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
  if (
    nodeId?.startsWith('node-end') &&
    responseResult?.answerMode === 0 &&
    !responseResult.nodeAnswerContent &&
    !beforeContent
  ) {
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
  const frame = JSON.parse(e.data);
  if (e.event === 'run') {
    const runId = String(frame.runId || frame.id || '');
    set({ runId, runStatus: frame.status || 'running' });
    get().setChatList(items =>
      items.map((item, index) =>
        index === items.length - 1
          ? {
              ...item,
              runId,
              status: frame.status,
              resolvedAgents: frame.resolvedAgents,
            }
          : item
      )
    );
    if (get().stopRequested && runId) get().handleStopConversation();
    return;
  }
  if (e.event === 'run-end') {
    set({ runStatus: frame.status });
    if (!get().debuggering && frame.status !== 'paused') {
      const flow = useFlowsManager.getState().currentFlow;
      if (flow?.id) getDialogues(flow.id, set);
    }
    get().setChatList(items =>
      items.map(item =>
        item.runId === frame.runId ? { ...item, status: frame.status } : item
      )
    );
    if (frame.status !== 'paused' && get().wsMessageStatus !== 'end') {
      handleFlowStop(
        {
          code: frame.status === 'completed' ? 0 : -1,
          message: frame.error || frame.status,
        },
        get
      );
    }
    if (frame.status !== 'paused') {
      set({ stopRequested: false });
      const manager = useFlowsManager.getState();
      manager.setFlowResult({
        ...manager.flowResult,
        status:
          frame.status === 'completed'
            ? 'success'
            : frame.status === 'cancelled' || frame.status === 'interrupted'
              ? frame.status
              : 'failed',
      });
    }
    if (
      typeof frame.durationMs === 'number' &&
      Number.isFinite(frame.durationMs)
    ) {
      const manager = useFlowsManager.getState();
      manager.setFlowResult({
        ...manager.flowResult,
        timeCost: (Math.max(0, frame.durationMs) / 1000).toString(),
      });
    }
    return;
  }
  const data: WebSocketMessageData = frame;
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
  if (get().stopRequested || get().runStatus === 'stopping') return;
  historyGeneration += 1;
  const currentFlow = useFlowsManager.getState().currentFlow;
  const nodes = useFlowStore.getState().nodes;
  const edges = useFlowStore.getState().edges;
  get().controllerRef?.abort();
  const controller = new AbortController();
  set({
    wsMessageStatus: 'start',
    debuggering: true,
    stopRequested: false,
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
    runId: get().runId,
    flow_id: currentFlow?.flowId,
    eventId: get().interruptChat?.eventId,
    eventType: content ? 'resume' : 'ignore',
    content,
  };
  if (get().versionId) {
    params.version =
      useFlowsManager.getState().historyVersionData?.versionNum ||
      get().versionId;
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
      if (e.event === 'run-end' && get().controllerRef === controller)
        handleMessage(nodes, edges, e, get, set);
      else sseLifecycle.onMessage(e);
    },
  }).catch(() => undefined);
  clearNodeStatus(get);
};
const runDebugger = (obj: RunDebuggerOptions): void => {
  const { nodes, edges, get, set, enters, regen = false } = obj;
  const currentFlow = useFlowsManager.getState().currentFlow;
  const historyVersion = useFlowsManager.getState().historyVersion;
  const retryId = regen ? obj.retryId : '';
  if (regen && !retryId) {
    get().setDebuggering(false);
    message.error('此历史没有可重试的运行标识，请发起新运行');
    return;
  }
  const url = getFixedUrl(
    retryId ? workflowRetryPath(retryId) : '/workflow/chat'
  );
  get().controllerRef?.abort();
  const controller = new AbortController();
  set({
    controllerRef: controller,
    runId: '',
    runStatus: 'running',
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
    params.version =
      useFlowsManager.getState().historyVersionData?.versionNum ||
      get().versionId;
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
      if (e.event === 'run-end' && get().controllerRef === controller)
        handleMessage(nodes, edges, e, get, set);
      else sseLifecycle.onMessage(e);
    },
  }).catch(() => undefined);
  clearNodeStatus(get);
};
const handleRunDebugger = ({
  nodes,
  edges,
  get,
  set,
  inputs,
  regen = false,
}: RunDebuggerOptions & { inputs?: StartNodeType[] }): void => {
  historyGeneration += 1;
  const retryId = regen ? get().runId : '';
  set({
    runId: '',
    runStatus: 'preparing',
    stopRequested: false,
    debuggering: true,
  });
  const currentFlow = useFlowsManager.getState().currentFlow;
  const setCanPublish = useFlowsManager.getState().setCanPublish;
  const setShowNodeList = useFlowsManager.getState().setShowNodeList;
  const setFlowResult = useFlowsManager.getState().setFlowResult;
  const historyVersion = useFlowsManager.getState().historyVersion;
  const setCanvasesDisabled = useFlowsManager.getState().setCanvasesDisabled;
  get().setSuggestProblem(() => []);
  get().buildPassRef = false;
  const params: BuildFlowParams = {
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
  const ready =
    regen || historyVersion ? Promise.resolve() : buildFlowAPI(params);
  ready
    .then(() => {
      if (get().stopRequested) {
        finishStopConversation(get, set, 'cancelled');
        return;
      }
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
        retryId,
      });
    })
    .catch(() => {
      set({ debuggering: false, stopRequested: false, runStatus: 'failed' });
      setCanvasesDisabled(false);
      setShowNodeList(true);
      setFlowResult({ status: 'failed', timeCost: '', totalTokens: '' });
    });
};
const clearData = (setOpen: (open: boolean) => void, get: ChatGetter): void => {
  if (
    get().debuggering ||
    get().interruptChat.interrupt ||
    get().runStatus === 'stopping'
  ) {
    get().handleStopConversation();
    return;
  }
  const setShowNodeList = useFlowsManager.getState().setShowNodeList;
  const setCanvasesDisabled = useFlowsManager.getState().setCanvasesDisabled;
  get().preRunningNodeIds = [];
  get().setStartNodeParams([]);
  if (get().userInput) {
    get().setUserInput('');
  }
  setOpen(false);
  setShowNodeList(true);
  setCanvasesDisabled(false);
};

const canRunDebugger = (get: ChatGetter): boolean => {
  if (get().stopRequested || get().runStatus === 'stopping') return false;
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
            name: get().startNodeParams[0]?.name || 'AGENT_USER_INPUT',
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

const finishStopConversation = (
  get: ChatGetter,
  set: ChatSetter,
  status: string
): void => {
  const setCanvasesDisabled = useFlowsManager.getState().setCanvasesDisabled;
  const historyVersion = useFlowsManager.getState().historyVersion;
  const setShowNodeList = useFlowsManager.getState().setShowNodeList;
  const setEdges = useFlowStore.getState().setEdges;
  const setFlowResult = useFlowsManager.getState().setFlowResult;
  get().chatIdRef = uuid().replace(/-/g, '');
  set({
    debuggering: false,
    stopRequested: false,
    wsMessageStatus: 'end',
    runStatus: status,
  });
  get().setChatList(chatList => [
    ...chatList,
    {
      id: uuid(),
      type: 'divider',
    },
  ]);
  get().setInterruptChat({ ...initInterruptChat });
  get().handleSaveDialogue();
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
    status: status === 'completed' ? 'success' : status,
    timeCost: '',
    totalTokens: '',
  });
};

const handleStopConversation = (get: ChatGetter, set: ChatSetter): void => {
  set({ stopRequested: true });
  const runId = get().runId;
  // A stop before the first run frame waits for the authoritative run ID.
  if (!runId || get().runStatus === 'stopping') return;
  const controller = get().controllerRef;
  const flowId = useFlowsManager.getState().currentFlow?.id;
  const previousStatus = get().runStatus;
  const isCurrent = (): boolean =>
    get().controllerRef === controller &&
    useFlowsManager.getState().currentFlow?.id === flowId;
  set({ runStatus: 'stopping' });
  void stopWorkflowSse({
    requestStop: () => stopWorkflowRun(runId),
    controller,
    isCurrent,
    onStopped: result => finishStopConversation(get, set, result.status),
  }).catch(() => {
    if (!isCurrent()) return;
    set({ stopRequested: false, runStatus: previousStatus });
    message.error('停止请求失败，请重试');
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
