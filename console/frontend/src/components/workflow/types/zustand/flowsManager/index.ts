import type { AdvancedConfigUpdate } from '../../drawer/advanced-config';
import type { VersionItem } from '../../drawer/chat-debugger';
import type { ParameterProperty } from '../../domain';
import type {
  WorkflowNode,
  WorkflowNodeTemplate,
  WorkflowNodeCategory,
  WorkflowModel,
  TextNodeConfig,
} from '../../domain';
import type { AgentStrategy } from '../../nodes/agent';

import { FlowType, ErrNodeType } from '../..';
import { FlowStoreType } from '../flow';
import { UseBoundStore, StoreApi } from 'zustand';

export type FlowsManagerStoreType = {
  singleNodeDebuggingInfo: {
    nodeId: string;
    controller: AbortController | null;
  };
  setSingleNodeDebuggingInfo: (singleNodeDebuggingInfo: {
    nodeId: string;
    controller: AbortController | null;
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
  willAddNode: WorkflowNodeTemplate | null;
  setWillAddNode: (willAddNode: WorkflowNodeTemplate | null) => void;
  beforeNode: (WorkflowNode & { sourceHandle?: string | null }) | null;
  setBeforeNode: (
    beforeNode: (WorkflowNode & { sourceHandle?: string | null }) | null
  ) => void;
  autonomousMode: boolean;
  setAutonomousMode: (autonomousMode: boolean) => void;
  openOperationResult: boolean;
  setOpenOperationResult: (
    openOperationResult: boolean | ((previous: boolean) => boolean)
  ) => void;
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
    repoId: string | number;
    tag?: string;
  };
  setKnowledgeDetailModalInfo: (knowledgeDetailModalInfo: {
    open: boolean;
    nodeId: string;
    repoId: string | number;
    tag?: string;
  }) => void;
  toolModalInfo: {
    open: boolean;
  };
  setToolModalInfo: (toolModalInfo: { open: boolean }) => void;
  mcpModalInfo: {
    open: boolean;
  };
  setMcpModalInfo: (mcpModalInfo: { open: boolean }) => void;
  flowModalInfo: {
    open: boolean;
  };
  setFlowModalInfo: (flowModalInfo: { open: boolean }) => void;
  rpaModalInfo: {
    open: boolean;
  };
  setRpaModalInfo: (rpaModalInfo: { open: boolean }) => void;
  currentStore?: UseBoundStore<StoreApi<FlowStoreType>>;
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
  removeTextNodeConfig: (id: string) => Promise<TextNodeConfig[]>;
  sparkLlmModels: WorkflowModel[];
  decisionMakingModels: WorkflowModel[];
  extractorParameterModels: WorkflowModel[];
  agentModels: WorkflowModel[];
  knowledgeProModels: WorkflowModel[];
  questionAnswerModels: WorkflowModel[];
  nodeList: WorkflowNodeCategory[];
  setNodeList: (
    update:
      | WorkflowNodeCategory[]
      | ((oldState: WorkflowNodeCategory[]) => WorkflowNodeCategory[])
  ) => void;
  errNodes: Array<ErrNodeType>;
  setErrNodes: (nodes: ErrNodeType[]) => void;
  showNodeList: boolean;
  setShowNodeList: (showNodeList: boolean) => void;
  updateNodeInputData: boolean;
  edgeType: string;
  setEdgeType: (edgeType: string) => void;
  setUpdateNodeInputData: (
    updateNodeInputData: boolean | ((previous: boolean) => boolean)
  ) => void;
  flowChatResultOpen: boolean;
  setFlowChatResultOpen: (flowChatResultOpen: boolean) => void;
  workflowTracePanelOpen: boolean;
  setWorkflowTracePanelOpen: (workflowTracePanelOpen: boolean) => void;
  flowResult: {
    status: string;
    timeCost?: string | number;
    totalTokens?: string | number;
  };
  setFlowResult: (flowResult: {
    status: string;
    timeCost?: string | number;
    totalTokens?: string | number;
  }) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  getFlowDetail: () => void;
  initFlowData: (id: string) => Promise<void>;
  currentFlow: FlowType | undefined;
  setCurrentFlow: (
    update:
      | FlowType
      | undefined
      | ((oldState: FlowType | undefined) => FlowType | undefined)
  ) => void;
  textNodeConfigList: TextNodeConfig[];
  setAgentStrategy: (
    value: AgentStrategy[] | ((old: AgentStrategy[]) => AgentStrategy[])
  ) => void;
  setKnowledgeProStrategy: (
    value: AgentStrategy[] | ((old: AgentStrategy[]) => AgentStrategy[])
  ) => void;
  setTextNodeConfigList: (
    textNodeConfigList:
      | TextNodeConfig[]
      | ((previous: TextNodeConfig[]) => TextNodeConfig[])
  ) => void;
  agentStrategy: AgentStrategy[];
  knowledgeProStrategy: AgentStrategy[];
  addTextNodeConfig: (params: unknown) => Promise<void>;
  autoSaveCurrentFlow: () => void;
  flushCurrentFlow: () => Promise<void>;
  draftSaveGeneration: number;
  draftLoaded: boolean;
  initializationError: string;
  adoptWorkflowDraft: (flow: FlowType) => void;
  hasUnsavedCurrentFlow: () => boolean;
  saveAdvancedConfig: (
    patch: AdvancedConfigUpdate,
    delayed: boolean,
    generation: number
  ) => void;
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
    data?: ParameterProperty;
  };
  setDefaultValueModalInfo: (
    update:
      | FlowsManagerStoreType['defaultValueModalInfo']
      | ((
          old: FlowsManagerStoreType['defaultValueModalInfo']
        ) => FlowsManagerStoreType['defaultValueModalInfo'])
  ) => void;
  promptOptimizeModalInfo: {
    open: boolean;
    nodeId: string;
    key: string;
  };
  setPromptOptimizeModalInfo: (
    update:
      | FlowsManagerStoreType['promptOptimizeModalInfo']
      | ((
          old: FlowsManagerStoreType['promptOptimizeModalInfo']
        ) => FlowsManagerStoreType['promptOptimizeModalInfo'])
  ) => void;
  nodeInfoEditDrawerlInfo: {
    open: boolean;
    nodeId: string;
  };
  setNodeInfoEditDrawerlInfo: (
    update:
      | FlowsManagerStoreType['nodeInfoEditDrawerlInfo']
      | ((
          old: FlowsManagerStoreType['nodeInfoEditDrawerlInfo']
        ) => FlowsManagerStoreType['nodeInfoEditDrawerlInfo'])
  ) => void;
  loadingModels: boolean;
  setLoadingModels: (loadingModels: boolean) => void;
  historyVersion: boolean;
  setHistoryVersion: (historyVersion: boolean) => void;
  historyVersionData: Partial<FlowType & VersionItem> | null;
  setHistoryVersionData: (
    historyVersionData: Partial<FlowType & VersionItem> | null
  ) => void;
  controlMode: string;
  setControlMode: (controlMode: string) => void;
};

export type UseUndoRedoOptions = {
  maxHistorySize: number;
  enableShortcuts: boolean;
};

export type FlowsManagerGetter = () => FlowsManagerStoreType;
export type FlowsManagerSetter = StoreApi<FlowsManagerStoreType>['setState'];
