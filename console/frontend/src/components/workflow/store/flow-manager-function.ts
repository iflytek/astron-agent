import type { Edge } from 'reactflow';
import type { TextNodeConfig } from '@/components/workflow/types/domain';
import type {
  WorkflowNode,
  WorkflowNodeCategory,
  WorkflowNodeData,
} from '../types/domain';
import type {
  FlowsManagerGetter,
  FlowsManagerSetter,
  FlowsManagerStoreType,
} from '../types/zustand/flowsManager';
import { cloneDeep } from 'lodash';
import { Node } from 'reactflow';
import i18next from 'i18next';
import { ErrNodeType } from '@/components/workflow/types';
import {
  getFlowDetailAPI,
  saveFlowAPI,
  flowsNodeTemplate,
  textNodeConfigList as textNodeConfigListAPI,
  textNodeConfigSave as textNodeConfigSaveAPI,
  textNodeConfigClear as textNodeConfigClearAPI,
  getAgentStrategyAPI,
  getKnowledgeProStrategyAPI,
  getFlowModelList,
  canPublishSetNotAPI,
} from '@/services/flow';

import { appendVariableAggregationNodeTemplate } from '../utils/variable-aggregation';
import useFlowStore from './use-flow-store';
import useIteratorFlowStore from './use-iterator-flow-store';
import { FlowStoreType } from '../types/zustand/flow';
import { UseBoundStore, StoreApi } from 'zustand';
import loopNodeIcon from '@/assets/imgs/workflow/loop-node-icon.svg';
import { getActiveImportDependencyIssues } from '@/components/workflow/utils/workflow-import-dependencies';
import {
  createSaveCoordinator,
  SaveCoordinator,
  SaveSnapshot,
  shouldPersistWorkflowDraft,
} from './workflow-save-coordinator';

export const initialStatus = {
  willAddNode: null, //Pending Node Information
  beforeNode: null, //Previous Node Information
  autonomousMode: false, //Whether to enable autonomous mode
  nodeList: [], //Node List
  sparkLlmModels: [], //Spark LLM Node Model List
  decisionMakingModels: [], //Decision Node Model List
  extractorParameterModels: [], //Parameter Extractor Node Model List
  agentModels: [], //Agent Node Model List
  knowledgeProModels: [], //Knowledge Base Pro Node Model List
  questionAnswerModels: [], //Question Answer Node Model List
  flowResult: {
    status: '',
    timeCost: '',
    totalTokens: '',
  }, //Flow Execution Result
  errNodes: [], //Nodes that failed validation
  currentFlow: undefined, //Current Flow Information
  showNodeList: true, //Whether to display the node list
  isLoading: true, //Initialize flow data loading
  canPublish: false, //Whether the flow can be published
  showIterativeModal: false, //Whether to display the iterative node modal
  selectAgentPromptModalInfo: {
    open: false,
    nodeId: '',
  }, //Select Agent Prompt Modal Information
  defaultValueModalInfo: {
    open: false,
    nodeId: '',
    paramsId: '',
    data: undefined,
  }, //Default Value Modal Information
  promptOptimizeModalInfo: {
    open: false,
    nodeId: '',
    key: 'template',
  }, //Optimize Prompt Modal Information
  clearFlowCanvasModalInfo: {
    open: false,
  }, //Clear Canvas Modal Information
  nodeInfoEditDrawerlInfo: {
    open: false,
    nodeId: '',
  }, //Node Information Edit Modal Information
  codeIDEADrawerlInfo: {
    open: false,
    nodeId: '',
  }, //Code IDEA Modal Information
  iteratorId: '', //Iterator Node ID
  currentStore: undefined, //Current Store
  flowChatResultOpen: false, //Flow Last Session Input Output Modal
  workflowTracePanelOpen: false, //Workflow Trace Panel
  edgeType: 'curve', //Edge Type
  loadingModels: false, //Load Model List
  canvasesDisabled: false, //Disable Canvas
  showMultipleCanvasesTip: false, //Multiple Open Modal Tip
  updateNodeInputData: false, //Update Node Input Data
  textNodeConfigList: [], //Text Node Separator Configuration List
  agentStrategy: [], //Agent Node Strategy
  knowledgeProStrategy: [], //Knowledge Base Pro Node Strategy
  openOperationResult: false, //Node Validation Result Modal
  knowledgeModalInfo: {
    open: false,
    nodeId: '',
  }, //Knowledge Base Node Add Knowledge Base Modal
  knowledgeDetailModalInfo: {
    open: false,
    nodeId: '',
    repoId: '',
  }, //Knowledge Base Node Corresponding Knowledge Base Detail Modal
  toolModalInfo: {
    open: false,
  }, //Tool Node Add Tool Modal
  mcpModalInfo: {
    open: false,
  }, //MCP Node Add MCP Modal
  flowModalInfo: {
    open: false,
  }, //Flow Node Add Flow Modal
  rpaModalInfo: {
    open: false,
  }, //RPA Node Add RPA Modal
  knowledgeParameterModalInfo: {
    open: false,
    nodeId: '',
  }, //Knowledge Base Node Configure Knowledge Base Parameter Modal
  knowledgeProParameterModalInfo: {
    open: false,
    nodeId: '',
  }, //Knowledge Base Pro Node Configure Knowledge Base Pro Parameter Modal
  advancedConfiguration: false, //Advanced Configuration Modal
  versionManagement: false, //Version Management Modal
  historyVersion: false, //Whether to be a history version
  historyVersionData: {}, //History Version Data
  controlMode: 'mouse', //Control Mode
  singleNodeDebuggingInfo: {
    nodeId: '',
    controller: null, //Node Controller
  }, //Single Node Debug Modal
} satisfies Partial<FlowsManagerStoreType>;

interface NodeValidationContext {
  currentCheckNode: WorkflowNode;
  outgoingEdges: Edge[];
  errNodes: ErrNodeType[];
}

interface TraversalContext extends NodeValidationContext {
  nodes: WorkflowNode[];
  recStack: Set<string>;
  visitedNodes: Set<string>;
  stack: { nodeId: string }[];
  cycleEdges: Edge[];
  dfs: () => void;
}

export interface ModelConfig {
  llmId: string;
  llmSource: string;
  serviceId: string;
  domain: string;
  patchId: string;
  url: string;
}

const intentOrderList = i18next.t('workflow.nodes.flow.intentNumbers', {
  returnObjects: true,
}) as string[];

// Helper function to get translated error messages
export const getFlowErrorMsg = (
  key: string,
  params?: Record<string, unknown>
): string => {
  return i18next.t(`workflow.nodes.flow.${key}`, params);
};
// Add Text Node Separator Config
export const addTextNodeConfig = async (
  params: unknown,
  get: FlowsManagerGetter
): Promise<void> => {
  await textNodeConfigSaveAPI(params);
  const textNodeConfigList = await textNodeConfigListAPI();
  get().setTextNodeConfigList(textNodeConfigList);
};
// Set Models
export const setModels = (appId: string, set: FlowsManagerSetter): void => {
  set({
    loadingModels: true,
  });
  Promise.all([
    getFlowModelList(appId, 'spark-llm'),
    getFlowModelList(appId, 'decision-making'),
    getFlowModelList(appId, 'extractor-parameter'),
    getFlowModelList(appId, 'agent'),
    getFlowModelList(appId, 'knowledge-pro-base'),
    getFlowModelList(appId, 'question-answer'),
  ])
    .then(
      ([
        sparkLlmModelsData,
        decisionMakingModelsData,
        extractorParameterModelsData,
        agentData,
        knowledgeProData,
        questionAnswerData,
      ]) => {
        const sparkLlmModels = sparkLlmModelsData?.workflow.flatMap(
          function (item) {
            return item.modelList;
          }
        );
        const decisionMakingModels = decisionMakingModelsData?.workflow.flatMap(
          function (item) {
            return item.modelList;
          }
        );
        const extractorParameterModels =
          extractorParameterModelsData?.workflow.flatMap(function (item) {
            return item.modelList;
          });
        const agentModels = agentData?.workflow.flatMap(function (item) {
          return item.modelList;
        });
        const knowledgeProModels = knowledgeProData?.workflow.flatMap(
          function (item) {
            return item.modelList;
          }
        );
        const questionAnswerModels = questionAnswerData?.workflow.flatMap(
          function (item) {
            return item.modelList;
          }
        );
        set({
          sparkLlmModels,
          decisionMakingModels,
          extractorParameterModels,
          agentModels,
          knowledgeProModels,
          questionAnswerModels,
          currentStore: useFlowStore,
        });
      }
    )
    .finally(() => set({ loadingModels: false }));
};
// Remove Text Node Separator Config
export const removeTextNodeConfig = async (
  id: string,
  get: FlowsManagerGetter
): Promise<TextNodeConfig[]> => {
  await textNodeConfigClearAPI(id);
  const textNodeConfigList = await textNodeConfigListAPI();
  get().setTextNodeConfigList(textNodeConfigList);
  return textNodeConfigList;
};
// Get Flow Detail
export const getFlowDetail = (get: FlowsManagerGetter): void => {
  get().setIsLoading(true);
  getFlowDetailAPI(get().currentFlow?.id || '')
    .then(data => {
      get().setCurrentFlow({
        ...data,
        originData: data?.data,
      });
      window.setTimeout(() => {
        get().setUpdateNodeInputData(!get().updateNodeInputData);
      }, 0);
    })
    .finally(() => get().setIsLoading(false));
};
// Init Flow Data
export const initFlowData = async (
  id: string,
  set: FlowsManagerSetter
): Promise<void> => {
  resetCurrentFlowSave();
  set({
    isLoading: true,
  });
  const [
    flow,
    nodeTemplate,
    textNodeConfigList,
    agentStrategy,
    knowledgeProStrategy,
  ] = await Promise.all([
    getFlowDetailAPI(id),
    flowsNodeTemplate(),
    textNodeConfigListAPI(),
    getAgentStrategyAPI(),
    getKnowledgeProStrategyAPI(),
  ]);
  const nodeList = appendVariableAggregationNodeTemplate(nodeTemplate).map(
    (category: WorkflowNodeCategory) => ({
      ...category,
      nodes: category.nodes?.map(node =>
        node?.idType === 'loop'
          ? {
              ...node,
              data: {
                ...node.data,
                icon: loopNodeIcon,
              },
              icon: loopNodeIcon,
            }
          : node
      ),
    })
  );

  set({
    currentFlow: {
      ...flow,
      originData: flow?.data,
    },
    isLoading: false,
    nodeList,
    textNodeConfigList,
    agentStrategy,
    knowledgeProStrategy,
    controlMode: window.localStorage.getItem('controlMode') || 'mouse',
  });
};

interface WorkflowSaveParams {
  id?: string;
  flowId?: string;
  name?: string;
  description?: string;
  data: {
    nodes: Node<WorkflowNodeData>[];
    edges: Edge[];
  };
}

interface WorkflowSaveResult {
  updateTime?: string;
  data?: string;
}

let currentFlowSaveCoordinator: SaveCoordinator | undefined;

const captureCurrentFlowSnapshot = (
  get: FlowsManagerGetter
): SaveSnapshot<WorkflowSaveParams> | undefined => {
  const currentFlow = get().currentFlow;
  if (!currentFlow || !shouldPersistWorkflowDraft(get().historyVersion)) {
    return undefined;
  }

  const flowStore = useFlowStore.getState();
  const params: WorkflowSaveParams = cloneDeep({
    id: currentFlow.id,
    flowId: currentFlow.flowId,
    name: currentFlow.name,
    description: currentFlow.description,
    data: {
      nodes: flowStore.nodes?.map(({ nodeType, ...reset }) => ({
        ...reset,
        data: {
          ...reset?.data,
          updatable: false,
        },
      })),
      edges: flowStore.edges,
    },
  });

  return {
    value: params,
    fingerprint: JSON.stringify(params),
  };
};

const getCurrentFlowSaveCoordinator = (
  get: FlowsManagerGetter
): SaveCoordinator => {
  if (!currentFlowSaveCoordinator) {
    currentFlowSaveCoordinator = createSaveCoordinator<
      WorkflowSaveParams,
      WorkflowSaveResult
    >({
      captureSnapshot: () => captureCurrentFlowSnapshot(get),
      persistSnapshot: params => saveFlowAPI(params),
      isSnapshotCurrent: params => {
        const currentFlow = get().currentFlow;
        return (
          shouldPersistWorkflowDraft(get().historyVersion) &&
          currentFlow?.id === params.id &&
          currentFlow?.flowId === params.flowId
        );
      },
      onPersisted: (data, params) => {
        const currentFlow = get().currentFlow;
        if (
          !currentFlow ||
          currentFlow.id !== params.id ||
          currentFlow.flowId !== params.flowId
        ) {
          return;
        }
        get().setCurrentFlow({
          ...currentFlow,
          updateTime: data.updateTime,
          originData: data.data,
        });
      },
      onSavingChange: saving => get().setIsLoading(saving),
    });
  }
  return currentFlowSaveCoordinator;
};

// Debounce background saves while preserving a single, ordered write stream.
export const autoSaveCurrentFlow = (get: FlowsManagerGetter): void => {
  if (!shouldPersistWorkflowDraft(get().historyVersion)) return;
  getCurrentFlowSaveCoordinator(get).schedule();
};

// Persist the latest editable main-canvas snapshot before a server preflight.
export const flushCurrentFlow = async (
  get: FlowsManagerGetter
): Promise<void> => {
  if (!shouldPersistWorkflowDraft(get().historyVersion)) return;
  await getCurrentFlowSaveCoordinator(get).flush();
};

export const resetCurrentFlowSave = (): void => {
  currentFlowSaveCoordinator?.reset();
};
// Can Publish Set Not
export const canPublishSetNot = (get: FlowsManagerGetter): void => {
  //改变画布时，如果调试页面打开的话需要关闭进行重新校验
  get().openOperationResult &&
    get().errNodes?.length === 0 &&
    get().setOpenOperationResult(false);
  //改变画布时，将画布可发布态置为false
  const flowId = get().currentFlow?.id;
  get().canPublish &&
    flowId &&
    canPublishSetNotAPI(flowId).then(() => {
      get().setCanPublish(false);
    });
};
// Set Current Store
export const setCurrentStore = (
  type: string,
  set: FlowsManagerSetter
): void => {
  set({
    currentStore: type === 'iterator' ? useIteratorFlowStore : useFlowStore,
  });
};
// Get Current Store
export const getCurrentStore = (
  get: FlowsManagerGetter
): UseBoundStore<StoreApi<FlowStoreType>> => {
  const store = get().currentStore;
  if (!store) {
    return useFlowStore;
  }
  return store;
};
// Reset Flows Manager
export const resetFlowsManager = (set: FlowsManagerSetter): void => {
  set({
    ...initialStatus,
  });
};
// Set Flow Result
export const setFlowResult = (
  flowResult: FlowsManagerStoreType['flowResult'],
  set: FlowsManagerSetter
): void => {
  set({
    flowResult,
  });
};
// Set Text Node Config List
export const setTextNodeConfigList = (
  change: Parameters<FlowsManagerStoreType['setTextNodeConfigList']>[0],
  get: FlowsManagerGetter,
  set: FlowsManagerSetter
): void => {
  const textNodeConfigList =
    typeof change === 'function' ? change(get().textNodeConfigList) : change;
  set({
    textNodeConfigList,
  });
};
// Set Agent Strategy
export const setAgentStrategy = (
  change: Parameters<FlowsManagerStoreType['setAgentStrategy']>[0],
  get: FlowsManagerGetter,
  set: FlowsManagerSetter
): void => {
  const agentStrategy =
    typeof change === 'function' ? change(get().agentStrategy) : change;
  set({
    agentStrategy,
  });
};
// Set Knowledge Pro Strategy
export const setKnowledgeProStrategy = (
  change: Parameters<FlowsManagerStoreType['setKnowledgeProStrategy']>[0],
  get: FlowsManagerGetter,
  set: FlowsManagerSetter
): void => {
  const knowledgeProStrategy =
    typeof change === 'function' ? change(get().knowledgeProStrategy) : change;
  set({
    knowledgeProStrategy,
  });
};

// Add Error Node
function addErrNode({
  errNodes,
  currentNode,
  msg,
}: {
  errNodes: ErrNodeType[];
  currentNode: WorkflowNode;
  msg: string;
}): void {
  const isExist = errNodes?.find(node => node?.id === currentNode?.id);
  if (isExist) return;
  const errNode: ErrNodeType = {
    id: currentNode.id,
    icon: currentNode.data.icon ?? '',
    name: currentNode?.data?.label,
    nodeType: currentNode?.nodeType,
    errorMsg: msg,
    childErrList: currentNode?.childErrList || [],
  };
  errNodes.push(errNode);
}

// Validate Node Base
function validateNodeBase({
  currentCheckNode,
  variableNodes,
  checkNode,
  errNodes,
}: {
  currentCheckNode: WorkflowNode;
  variableNodes: WorkflowNode[];
  checkNode: FlowStoreType['checkNode'];
  errNodes: ErrNodeType[];
}): void {
  const importIssues = getActiveImportDependencyIssues([currentCheckNode]);
  if (importIssues.length > 0) {
    addErrNode({
      errNodes,
      currentNode: currentCheckNode,
      msg: getFlowErrorMsg('importDependencyUnresolved'),
    });
    return;
  }
  if (!checkNode(currentCheckNode.id)) {
    addErrNode({
      errNodes,
      currentNode: currentCheckNode,
      msg: getFlowErrorMsg('nodeValidationFailed'),
    });
    useFlowStore
      .getState()
      .setNode(currentCheckNode.id, cloneDeep(currentCheckNode));
  }
  if (currentCheckNode.id.includes('node-variable')) {
    variableNodes.push(currentCheckNode);
  }
}

// Validate Decision Making Node
function validateDecisionMakingNode({
  currentCheckNode,
  outgoingEdges,
  errNodes,
}: NodeValidationContext): void {
  const intentChains = currentCheckNode.data.nodeParam.intentChains ?? [];
  let flag = true;
  let errorNodeMsg = '';
  intentChains.forEach((intentChain, index) => {
    const hasIntentChainEdge = outgoingEdges.some(
      edge => edge.sourceHandle === intentChain.id
    );
    if (!hasIntentChainEdge) {
      flag = false;
      errorNodeMsg =
        index === intentChains?.length - 1
          ? getFlowErrorMsg('defaultIntentNotConnected')
          : getFlowErrorMsg('intentNotConnected', {
              intentNumber: intentOrderList[index],
            });
    }
  });
  if (!flag)
    addErrNode({ errNodes, currentNode: currentCheckNode, msg: errorNodeMsg });
}

// Validate If Else Node
function validateIfElseNode({
  currentCheckNode,
  outgoingEdges,
  errNodes,
}: NodeValidationContext): void {
  const cases = currentCheckNode.data.nodeParam.cases ?? [];
  let flag = true;
  let errorNodeMsg = '';
  cases.forEach((intentCase, index) => {
    const hasCaseEdge = outgoingEdges.some(
      edge => edge.sourceHandle === intentCase.id
    );
    if (!hasCaseEdge) {
      flag = false;
      const title =
        index === 0
          ? getFlowErrorMsg('if')
          : index !== cases.length - 1
            ? getFlowErrorMsg('elseIf', { priority: intentCase.level })
            : getFlowErrorMsg('else');
      errorNodeMsg = `${title}${getFlowErrorMsg('edgeNotConnected')}`;
    }
  });
  if (!flag)
    addErrNode({ errNodes, currentNode: currentCheckNode, msg: errorNodeMsg });
}

// Validate Question Answer Node
function validateQuestionAnswerNode({
  currentCheckNode,
  outgoingEdges,
  errNodes,
}: NodeValidationContext): void {
  const optionAnswer = currentCheckNode.data.nodeParam.optionAnswer ?? [];
  let flag = true;
  let errorNodeMsg = '';
  optionAnswer.forEach(option => {
    const hasCaseEdge = outgoingEdges.some(
      edge => edge.sourceHandle === option.id
    );
    if (!hasCaseEdge) {
      flag = false;
      const title =
        option?.type === 2
          ? getFlowErrorMsg('option', { optionName: option?.name })
          : getFlowErrorMsg('otherOption');
      errorNodeMsg = `${title}${getFlowErrorMsg('edgeNotConnected')}`;
    }
  });
  if (!flag)
    addErrNode({ errNodes, currentNode: currentCheckNode, msg: errorNodeMsg });
}

// Validate Retry Config Node
function validateRetryConfigNode({
  currentCheckNode,
  outgoingEdges,
  errNodes,
}: NodeValidationContext): void {
  if (
    currentCheckNode?.data?.retryConfig?.shouldRetry &&
    currentCheckNode?.data?.retryConfig?.errorStrategy === 2
  ) {
    const exceptionHandlingEdge =
      currentCheckNode?.data?.nodeParam?.exceptionHandlingEdge;
    const hasExceptionHandlingEdge = outgoingEdges.some(
      edge => edge.sourceHandle === exceptionHandlingEdge
    );
    if (!hasExceptionHandlingEdge)
      addErrNode({
        errNodes,
        currentNode: currentCheckNode,
        msg: '异常处理节点存在未连接的边',
      });
    if (outgoingEdges?.length === 1)
      addErrNode({
        errNodes,
        currentNode: currentCheckNode,
        msg: '该节点存在未连接的边',
      });
  }
}

// Validate Outgoing Edges
function validateOutgoingEdges({
  currentCheckNode,
  outgoingEdges,
  nodes,
  recStack,
  visitedNodes,
  stack,
  errNodes,
  cycleEdges,
  dfs,
}: TraversalContext): void | boolean {
  if (currentCheckNode?.nodeType === 'loop-exit') {
    recStack.delete(currentCheckNode.id);
    return;
  }
  if (outgoingEdges?.length === 0) {
    addErrNode({
      errNodes,
      currentNode: currentCheckNode,
      msg: getFlowErrorMsg('nodeNotConnected'),
    });
    return;
  }

  for (const edge of outgoingEdges) {
    const targetNode = nodes.find(node => node.id === edge.target);
    if (!targetNode) return false;
    if (!targetNode.data.label?.trim()) return false;
    if (recStack.has(targetNode.id)) {
      cycleEdges.push(edge);
      addErrNode({
        errNodes,
        currentNode: targetNode,
        msg: getFlowErrorMsg('cycleDependency'),
      });
      return;
    }

    if (!visitedNodes.has(targetNode.id)) {
      stack.push({ nodeId: targetNode.id });
      dfs();
    }
  }
  recStack.delete(currentCheckNode.id);
}

// Check Iterator/Loop Node
function checkIteratorNode({
  iteratorId,
  outerErrNodes,
  cycleEdges,
}: {
  iteratorId: string;
  outerErrNodes: ErrNodeType[];
  cycleEdges: Edge[];
}): void {
  const {
    nodes: allNodes,
    edges: allEdges,
    checkNode,
  } = useFlowStore.getState();
  const nodes = allNodes?.filter(node => node?.data?.parentId === iteratorId);
  const nodeIds = nodes?.map(node => node?.id);
  const edges = allEdges?.filter(
    edge => nodeIds?.includes(edge?.source) || nodeIds?.includes(edge?.target)
  );

  const iteratorNodeInfo = useFlowStore
    .getState()
    .nodes.find(node => node?.id === iteratorId);
  const isLoop = iteratorNodeInfo?.nodeType === 'loop';
  const startNode = nodes.find(node =>
    isLoop
      ? node.nodeType === 'loop-node-start'
      : node.nodeType === 'iteration-node-start'
  );
  const endNode = nodes.find(node =>
    isLoop
      ? node.nodeType === 'loop-node-end'
      : node.nodeType === 'iteration-node-end'
  );

  const visitedNodes = new Set<string>();
  const errNodes: ErrNodeType[] = [];
  const stack: { nodeId: string }[] = startNode
    ? [{ nodeId: startNode.id }]
    : [];
  const variableNodes: WorkflowNode[] = [];
  const recStack = new Set<string>();

  function dfs(): void {
    const next = stack.pop();
    if (!next) return;
    const { nodeId } = next;
    const currentCheckNode = nodes.find(node => node.id === nodeId);
    if (!currentCheckNode || !nodeId) return;

    if (!visitedNodes.has(nodeId)) {
      visitedNodes.add(nodeId);
      recStack.add(nodeId);
    }

    validateNodeBase({ currentCheckNode, variableNodes, checkNode, errNodes });

    if (nodeId === endNode?.id) {
      recStack.delete(nodeId);
      return;
    }

    const outgoingEdges = edges.filter(edge => edge.source === nodeId);

    switch (currentCheckNode.nodeType) {
      case 'decision-making':
        validateDecisionMakingNode({
          currentCheckNode,
          outgoingEdges,
          errNodes,
        });
        break;
      case 'if-else':
        validateIfElseNode({ currentCheckNode, outgoingEdges, errNodes });
        break;
      case 'question-answer':
        if (currentCheckNode.data.nodeParam?.answerType === 'option')
          validateQuestionAnswerNode({
            currentCheckNode,
            outgoingEdges,
            errNodes,
          });
        break;
      default:
        validateRetryConfigNode({ currentCheckNode, outgoingEdges, errNodes });
    }

    validateOutgoingEdges({
      currentCheckNode,
      outgoingEdges,
      nodes,
      recStack,
      visitedNodes,
      stack,
      errNodes,
      cycleEdges,
      dfs,
    });
  }

  dfs();

  nodes.forEach(node => {
    if (!visitedNodes.has(node.id))
      addErrNode({
        errNodes,
        currentNode: node,
        msg: getFlowErrorMsg('nodeNotConnected'),
      });
  });

  if (errNodes.length > 0) {
    const currentIteratorNode = outerErrNodes?.find(
      node => node?.id === iteratorId
    );
    if (currentIteratorNode) currentIteratorNode.childErrList = errNodes;
    else {
      if (!iteratorNodeInfo) return;
      iteratorNodeInfo.childErrList = errNodes;
      addErrNode({
        errNodes: outerErrNodes,
        currentNode: iteratorNodeInfo,
        msg: getFlowErrorMsg('subNodeNotSatisfied'),
      });
    }
  }
}

// Check Flow
export function checkFlow(get: FlowsManagerGetter): boolean {
  const { nodes, edges, checkNode, setEdges } = useFlowStore.getState();
  const errNodes: ErrNodeType[] = [];
  const cycleEdges: Edge[] = [];

  const startNode = nodes.find(node => node.nodeType === 'node-start');
  const endNode = nodes.find(node => node.nodeType === 'node-end');
  const visitedNodes = new Set<string>();
  const recStack = new Set<string>();
  const stack: { nodeId: string }[] = startNode
    ? [{ nodeId: startNode.id }]
    : [];
  const variableNodes: WorkflowNode[] = [];

  function dfs(): void {
    const nodeInfo = stack.pop();
    const nodeId = nodeInfo?.nodeId;
    const currentCheckNode = nodes.find(node => node.id === nodeId);

    if (!currentCheckNode || !nodeId) return;

    if (!visitedNodes.has(nodeId)) {
      visitedNodes.add(nodeId);
      recStack.add(nodeId);
    }

    validateNodeBase({ currentCheckNode, variableNodes, checkNode, errNodes });

    if (['iteration', 'loop'].includes(currentCheckNode?.nodeType)) {
      checkIteratorNode({
        iteratorId: currentCheckNode.id,
        outerErrNodes: errNodes,
        cycleEdges,
      });
    }

    if (nodeId === endNode?.id) {
      recStack.delete(nodeId);
      return;
    }

    const outgoingEdges = edges.filter(edge => edge.source === nodeId);

    switch (currentCheckNode?.nodeType) {
      case 'decision-making':
        validateDecisionMakingNode({
          currentCheckNode,
          outgoingEdges,
          errNodes,
        });
        break;
      case 'if-else':
        validateIfElseNode({ currentCheckNode, outgoingEdges, errNodes });
        break;
      case 'question-answer':
        if (currentCheckNode.data.nodeParam?.answerType === 'option')
          validateQuestionAnswerNode({
            currentCheckNode,
            outgoingEdges,
            errNodes,
          });
        break;
      default:
        validateRetryConfigNode({ currentCheckNode, outgoingEdges, errNodes });
    }

    validateOutgoingEdges({
      currentCheckNode,
      outgoingEdges,
      nodes,
      recStack,
      visitedNodes,
      stack,
      errNodes,
      cycleEdges,
      dfs,
    });
  }

  dfs();

  //not visitedNodes add error msg
  nodes.forEach(node => {
    if (!visitedNodes.has(node.id) && !node?.data?.parentId)
      addErrNode({
        errNodes,
        currentNode: node,
        msg: getFlowErrorMsg('nodeNotConnected'),
      });
  });

  get().setErrNodes(errNodes);
  //cycle edges set red color
  if (cycleEdges?.length) {
    setEdges(currentEdges =>
      currentEdges.map(edge => {
        const isCycleEdge = cycleEdges?.find(
          item => item.target === edge.target && item.source === edge.source
        );
        return {
          ...edge,
          animated: false,
          style: {
            stroke: isCycleEdge ? 'red' : '#6356EA',
            strokeWidth: 2,
          },
        };
      })
    );
  } else {
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
  }
  return errNodes?.length === 0;
}
