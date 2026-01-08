import { Node } from 'reactflow';
import { FlowType, ErrNodeType } from '../..';
import { FlowStoreType } from '../flow';
import { UseBoundStore, StoreApi } from 'zustand';

export type FlowsManagerStoreType = {
  singleNodeDebuggingInfo: {
    nodeId: string;
    controller: unknown;
  };
  setSingleNodeDebuggingInfo: (singleNodeDebuggingInfo: {
    nodeId: string;
    controller: unknown;
  }) => void;
  clearFlowCanvasModalInfo: {
    open: boolean;
  };
  setClearFlowCanvasModalInfo: (clearFlowCanvasModalInfo: {
    open: boolean;
  }) => void;
  codeIDEADrawerlInfo: {
    open: boolean;
    nodeId: string;
  };
  setCodeIDEADrawerlInfo: (codeIDEADrawerlInfo: {
    open: boolean;
    nodeId: string;
  }) => void;
  willAddNode: unknown;
  setWillAddNode: (willAddNode: unknown) => void;
  beforeNode: unknown;
  setBeforeNode: (beforeNode: unknown) => void;
  autonomousMode: boolean;
  setAutonomousMode: (autonomousMode: boolean) => void;
  openOperationResult: boolean;
  setOpenOperationResult: (openOperationResult: unknown) => void;
  canvasesDisabled: boolean;
  setCanvasesDisabled: (canvasesDisabled: boolean) => void;
  showMultipleCanvasesTip: boolean;
  setShowMultipleCanvasesTip: (showMultipleCanvasesTip: boolean) => void;
  advancedConfiguration: boolean;
  setAdvancedConfiguration: (advancedConfiguration: boolean) => void;
  versionManagement: boolean;
  setVersionManagement: (versionManagement: boolean) => void;
  knowledgeModalInfo: {
    open: boolean;
    nodeId: string;
  };
  setKnowledgeModalInfo: (knowledgeModalInfo: {
    open: boolean;
    nodeId: string;
  }) => void;
  knowledgeDetailModalInfo: {
    open: boolean;
    nodeId: string;
    repoId: string;
  };
  setKnowledgeDetailModalInfo: (knowledgeDetailModalInfo: {
    open: boolean;
    nodeId: string;
    repoId: string;
  }) => void;
  toolModalInfo: {
    open: boolean;
  };
  setToolModalInfo: (toolModalInfo: { open: boolean }) => void;
  flowModalInfo: {
    open: boolean;
  };
  setFlowModalInfo: (flowModalInfo: { open: boolean }) => void;
  rpaModalInfo: {
    open: boolean;
  };
  setRpaModalInfo: (rpaModalInfo: { open: boolean }) => void;
  currentStore?: unknown;
  knowledgeParameterModalInfo: {
    open: boolean;
    nodeId: string;
  };
  setKnowledgeParameterModalInfo: (knowledgeParameterModalInfo: {
    open: boolean;
    nodeId: string;
  }) => void;
  knowledgeProParameterModalInfo: {
    open: boolean;
    nodeId: string;
  };
  setKnowledgeProParameterModalInfo: (knowledgeProParameterModalInfo: {
    open: boolean;
    nodeId: string;
  }) => void;
  setCurrentStore: (iteratorStore: string) => void;
  getCurrentStore: () => UseBoundStore<StoreApi<FlowStoreType>>;
  removeTextNodeConfig: (id: string) => void;
  sparkLlmModels: unknown[];
  decisionMakingModels: unknown[];
  extractorParameterModels: unknown[];
  agentModels: unknown[];
  knowledgeProModels: unknown[];
  questionAnswerModels: unknown[];
  nodeList: unknown[];
  setNodeList: (
    update: unknown[] | ((oldState: unknown[]) => unknown[])
  ) => void;
  errNodes: Array<ErrNodeType>;
  setErrNodes: (node: Node | null, string?) => void;
  showNodeList: boolean;
  setShowNodeList: (showNodeList: boolean) => void;
  updateNodeInputData: boolean;
  edgeType: string;
  setEdgeType: (edgeType: string) => void;
  setUpdateNodeInputData: (updateNodeInputData: unknown) => void;
  flowChatResultOpen: boolean;
  setFlowChatResultOpen: (flowChatResultOpen: boolean) => void;
  flowResult: { status: string; timeCost: string; totalTokens: string };
  setFlowResult: (flowResult: {
    status: string;
    timeCost: string;
    totalTokens: string;
  }) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  getFlowDetail: () => void;
  initFlowData: (id: string) => Promise<void>;
  currentFlow: FlowType | undefined;
  setCurrentFlow: (
    update: (FlowType | unknown) | ((oldState: FlowType) => FlowType)
  ) => void;
  textNodeConfigList: unknown;
  setTextNodeConfigList: (textNodeConfigList: unknown) => void;
  agentStrategy: unknown;
  setAgentStrategy: (agentStrategy: unknown) => void;
  knowledgeProStrategy: unknown;
  setKnowledgeProStrategy: (knowledgeProStrategy: unknown) => void;
  addTextNodeConfig: (params: unknown) => Promise<void>;
  autoSaveCurrentFlow: () => void;
  canPublishSetNot: () => void;
  checkFlow: () => boolean;
  canPublish: boolean;
  setCanPublish: (canPublish: boolean) => void;
  setModels: (appId: string) => void;
  resetFlowsManager: () => void;
  iteratorId: string;
  setIteratorId: (iteratorId: string) => void;
  showIterativeModal: boolean;
  setShowIterativeModal: (showIterativeModal: boolean) => void;
  selectAgentPromptModalInfo: {
    open: boolean;
    nodeId: string;
  };
  setSelectAgentPromptModalInfo: (selectAgentPromptModalInfo: {
    open: boolean;
    nodeId: string;
  }) => void;
  defaultValueModalInfo: {
    open: boolean;
    nodeId: string;
    paramsId: string;
    data: unknown;
  };
  setDefaultValueModalInfo: (defaultValueModalInfo: unknown) => void;
  promptOptimizeModalInfo: {
    open: boolean;
    nodeId: string;
    key: string;
  };
  setPromptOptimizeModalInfo: (promptOptimizeModalInfo: unknown) => void;
  nodeInfoEditDrawerlInfo: {
    open: boolean;
    nodeId: string;
  };
  setNodeInfoEditDrawerlInfo: (nodeInfoEditDrawerlInfo: unknown) => void;
  loadingModels: boolean;
  setLoadingModels: (loadingModels: boolean) => void;
  historyVersion: boolean;
  setHistoryVersion: (historyVersion: boolean) => void;
  historyVersionData: unknown;
  setHistoryVersionData: (historyVersionData: unknown) => void;
  controlMode: string;
  setControlMode: (controlMode: string) => void;
};

export type UseUndoRedoOptions = {
  maxHistorySize: number;
  enableShortcuts: boolean;
};
