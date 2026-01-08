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
import { getModelConfigDetail } from '@/services/common';
import useFlowStore from './use-flow-store';
import useIteratorFlowStore from './use-iterator-flow-store';
import { FlowStoreType } from '../types/zustand/flow';
import { UseBoundStore, StoreApi } from 'zustand';

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
    data: {},
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
};

export interface ModelConfig {
  llmId: string;
  llmSource: string;
  serviceId: string;
  domain: string;
  patchId: string;
  url: string;
}

interface NodeParam {
  configs: unknown[];
  domain: string;
  serviceId: string;
  patchId: string;
  url: string;
  [key: string]: unknown;
}

interface NodeData {
  nodeParam: NodeParam;
  label: string;
  icon?: string;
  inputs?: unknown[];
  outputs?: unknown[];
  retryConfig?: {
    shouldRetry: boolean;
    errorStrategy: number;
  };
  references?: unknown[];
  childErrList?: ErrNodeType[];
  parentId?: string;
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
  get
): Promise<void> => {
  const res = await textNodeConfigSaveAPI(params);
  const textNodeConfigList = await textNodeConfigListAPI();
  get().setTextNodeConfigList(textNodeConfigList);
  return res;
};
// Set Models
export const setModels = (appId: string, set): void => {
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
  get
): Promise<unknown> => {
  await textNodeConfigClearAPI(id);
  const textNodeConfigList = await textNodeConfigListAPI();
  get().setTextNodeConfigList(textNodeConfigList);
  return textNodeConfigList;
};
// Get Flow Detail
export const getFlowDetail = (get): void => {
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
export const initFlowData = async (id: string, set): Promise<void> => {
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

  set({
    currentFlow: {
      ...flow,
      originData: flow?.data,
    },
    isLoading: false,
    nodeList: nodeTemplate,
    textNodeConfigList,
    agentStrategy,
    knowledgeProStrategy,
    controlMode: window.localStorage.getItem('controlMode') || 'mouse',
  });
};

let saveTimeoutId: number | null = null;
// Auto Save Current Flow
export const autoSaveCurrentFlow = (get): void => {
  if (saveTimeoutId) {
    window.clearTimeout(saveTimeoutId);
  }
  saveTimeoutId = window.setTimeout(() => {
    const currentFlow = get().currentFlow;
    const flowStore = useFlowStore.getState();
    const nodes = flowStore.nodes;
    const edges = flowStore.edges;
    if (currentFlow) {
      const params = {
        id: currentFlow?.id,
        flowId: currentFlow?.flowId,
        name: currentFlow?.name,
        description: currentFlow?.description,
        data: {
          nodes: nodes?.map(({ nodeType, ...reset }) => ({
            ...reset,
            data: {
              ...reset?.data,
              updatable: false,
            },
          })),
          edges,
        },
      };
      get().setIsLoading(true);
      saveFlowAPI(params)
        .then(data =>
          get().setCurrentFlow({
            ...currentFlow,
            updateTime: data.updateTime,
            originData: data.data,
          })
        )
        .finally(() => get().setIsLoading(false));
    }
  }, 300);
};
// Can Publish Set Not
export const canPublishSetNot = (get): void => {
  //改变画布时，如果调试页面打开的话需要关闭进行重新校验
  get().openOperationResult &&
    get().errNodes?.length === 0 &&
    get().setOpenOperationResult(false);
  //改变画布时，将画布可发布态置为false
  !get().chatMode &&
    get().canPublish &&
    canPublishSetNotAPI(get().currentFlow?.id).then(() => {
      get().setCanPublish(false);
    });
};
// Set Current Store
export const setCurrentStore = (type: string, set): void => {
  set({
    currentStore: type === 'iterator' ? useIteratorFlowStore : useFlowStore,
  });
};
// Get Current Store
export const getCurrentStore = (
  get
): UseBoundStore<StoreApi<FlowStoreType>> => {
  const store = get().currentStore;
  if (!store) {
    return useFlowStore;
  }
  return store;
};
// Reset Flows Manager
export const resetFlowsManager = (set): void => {
  set({
    ...initialStatus,
  });
};
// Set Flow Result
export const setFlowResult = (flowResult, set): void => {
  set({
    flowResult,
  });
};
// Set Text Node Config List
export const setTextNodeConfigList = (change, get, set): void => {
  const textNodeConfigList =
    typeof change === 'function' ? change(get().textNodeConfigList) : change;
  set({
    textNodeConfigList,
  });
};
// Set Agent Strategy
export const setAgentStrategy = (change, get, set): void => {
  const agentStrategy =
    typeof change === 'function' ? change(get().agentStrategy) : change;
  set({
    agentStrategy,
  });
};
// Set Knowledge Pro Strategy
export const setKnowledgeProStrategy = (change, get, set): void => {
  const knowledgeProStrategy =
    typeof change === 'function' ? change(get().knowledgeProStrategy) : change;
  set({
    knowledgeProStrategy,
  });
};

// Add Error Node
function addErrNode({ errNodes, currentNode, msg }): void {
  const isExist = errNodes?.find(node => node?.id === currentNode?.id);
  if (isExist) return;
  const errNode = {
    id: currentNode?.id,
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
}): void {
  if (
    !checkNode(
      currentCheckNode.id,
      variableNodes.filter(node => node.id !== currentCheckNode.id)
    )
  ) {
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
}): void {
  const intentChains = currentCheckNode?.data?.nodeParam?.intentChains;
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
}): void {
  const cases = currentCheckNode?.data?.nodeParam?.cases;
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
}): void {
  const optionAnswer = currentCheckNode.data.nodeParam.optionAnswer;
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
}): void {
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
}): void | boolean {
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
    if (!targetNode.data.label.trim()) return false;
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

// Check Iterator Node
function checkIteratorNode({ iteratorId, outerErrNodes, cycleEdges }): void {
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

  const startNode = nodes.find(
    node => node.nodeType === 'iteration-node-start'
  );
  const endNode = nodes.find(node => node.nodeType === 'iteration-node-end');

  const visitedNodes = new Set();
  const errNodes: unknown = [];
  const stack: unknown[] = [{ nodeId: startNode?.id }];
  const variableNodes: unknown[] = [];
  const recStack = new Set();

  function dfs(): void {
    const { nodeId } = stack.pop();
    const currentCheckNode = nodes.find(node => node.id === nodeId);

    if (!visitedNodes.has(nodeId)) {
      visitedNodes.add(nodeId);
      recStack.add(nodeId);
    }

    validateNodeBase({ currentCheckNode, variableNodes, checkNode, errNodes });

    if (nodeId === endNode.id) {
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
    const iteratorNodeInfo = useFlowStore
      .getState()
      .nodes.find(node => node?.id === iteratorId);
    if (currentIteratorNode) currentIteratorNode.childErrList = errNodes;
    else {
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
export function checkFlow(get): boolean {
  const { nodes, edges, checkNode, setEdges } = useFlowStore.getState();
  const errNodes: unknown[] = [];
  const cycleEdges: unknown[] = [];

  const startNode = nodes.find(node => node.nodeType === 'node-start');
  const endNode = nodes.find(node => node.nodeType === 'node-end');
  const visitedNodes = new Set();
  const recStack = new Set();
  const stack: { nodeId: string | null }[] = [
    { nodeId: startNode?.id || null },
  ];
  const variableNodes: unknown[] = [];

  function dfs(): void {
    const nodeInfo = stack.pop();
    const nodeId = nodeInfo?.nodeId;
    const currentCheckNode = nodes.find(node => node.id === nodeId);

    if (!currentCheckNode) return;

    if (!visitedNodes.has(nodeId)) {
      visitedNodes.add(nodeId);
      recStack.add(nodeId);
    }

    validateNodeBase({ currentCheckNode, variableNodes, checkNode, errNodes });

    if (currentCheckNode?.nodeType === 'iteration') {
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
