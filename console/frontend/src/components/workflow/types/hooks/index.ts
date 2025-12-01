import { RpaInfo, RpaNodeParam } from '@/types/rpa';
import {
  AddNodeType,
  ToolType,
  FlowType,
  PositionType,
  NewNodeType,
} from '../drawer/chat-debugger';
import React from 'react';

// Hook 相关类型定义

// useFlowTypeRender Hook 相关类型
export interface ItemType {
  fileType?: string;
  type?: string;
  schema?: {
    type?: string;
    value?: {
      type?: string;
      content?: {
        name?: string;
      };
    };
  };
}

// useNodeCommon Hook 相关类型
export interface NodeCommonProps {
  id: string;
  data?: NodeDataType;
}

export interface UseNodeInfoReturn {
  nodeType: string;
  isStartNode: boolean;
  isIteratorStart: boolean;
  isEndNode: boolean;
  isIteratorEnd: boolean;
  isKnowledgeNode: boolean;
  isQuestionAnswerNode: boolean;
  isDecisionMakingNode: boolean;
  isIfElseNode: boolean;
  isIteratorNode: boolean;
  isIteratorChildNode: boolean;
  isAgentNode: boolean;
  isStartOrEndNode: boolean;
  isCodeNode: boolean;
  isDataBaseNode: boolean;
  showInputs: boolean;
  showOutputs: boolean;
  showExceptionFlow: boolean;
  references: ReferenceItem[];
  inputs: InputItem[];
  outputs: OutputItem[];
  showNodeOperation: boolean;
  currentNode?: {
    id: string;
    type?: string;
    data?: NodeDataType;
    [key: string]: unknown;
  };
  nodeParam: Record<string, unknown>;
  nodeIcon: string;
  nodeDesciption: string;
  isThinkModel: boolean;
}

export interface UseNodeFuncReturn {
  handleNodeClick: () => void;
  handleChangeNodeParam: (
    fn: (data: NodeDataType, value: unknown) => void,
    value: unknown
  ) => void;
  handleChangeOutputParam: (
    outputId: string,
    fn: (data: OutputItem, value: unknown) => void,
    value: unknown
  ) => void;
  handleIteratorEndChange: (
    type: 'add' | 'remove' | 'replace',
    outputId: string,
    value?: unknown,
    currentNode?: NodeDataType
  ) => void;
  handleAddOutputLine: () => void;
  handleRemoveOutputLine: (outputId: string) => void;
  isFixedOutputComponentFunc: (output: OutputItem) => boolean;
}

export interface UseNodeOutputRenderReturn {
  handleCustomOutputGenerate: () => void;
  renderOutputComponent: (
    output: OutputItem,
    outputs: OutputItem[],
    reset: {
      disabled?: boolean;
      typeStringOnly?: boolean;
      hasDescription?: boolean;
      hasRef?: boolean;
      allowRemove?: boolean;
    }
  ) => React.ReactElement;
  outputTypeList: Array<{
    label: string;
    value: string;
    children?: Array<{
      label: string;
      value: string;
    }>;
  }>;
}

export interface UseNodeModelsReturn {
  models: Array<{
    llmId?: string;
    [key: string]: unknown;
  }>;
  model: {
    llmId?: string;
    [key: string]: unknown;
  };
  isThinkModel: boolean;
}

export interface NodeDataType {
  nodeParam?: Record<string, unknown>;
  inputs?: InputItem[];
  outputs?: OutputItem[];
  references?: ReferenceItem[];
  retryConfig?: RetryConfig;
  parentId?: string;
}

export interface InputItem {
  id: string;
  name: string;
  schema?: SchemaType;
  type?: string;
  required?: boolean;
}

export interface OutputItem {
  id: string;
  name: string;
  schema?: SchemaType;
  type?: string;
  required?: boolean;
  fileType?: string;
  allowedFileType?: string[];
  deleteDisabled?: boolean;
  customParameterType?: string;
  isChild?: boolean;
  nameErrMsg?: string;
  properties?: PropertyItem[];
}

export interface PropertyItem {
  id: string;
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  key?: string;
  isChild?: boolean;
  title?: React.ReactElement;
  properties?: PropertyItem[];
}

export interface ReferenceItem {
  id?: string;
  label: string;
  value: string;
}

export interface SchemaType {
  type?: string;
  default?: string;
  properties?: PropertyItem[];
  value?: {
    type?: string;
    content?: Record<string, unknown>;
    contentErrMsg?: string;
  };
}

export interface RetryConfig {
  shouldRetry?: boolean;
  errorStrategy?: number;
  customOutput?: string;
}

export interface UseNodeCommonReturn {
  handleNodeClick: () => void;
  handleChangeNodeParam: (
    fn: (data: NodeDataType, value: unknown) => void,
    value: unknown
  ) => void;
  handleChangeInputParam: (
    inputId: string,
    fn: (data: InputItem, value: unknown) => void,
    value: unknown
  ) => void;
  handleChangeOutputParam: (
    outputId: string,
    fn: (data: OutputItem, value: unknown) => void,
    value: unknown
  ) => void;
  handleAddOutputLine: () => void;
  handleRemoveOutputLine: (outputId: string) => void;
  handleCustomOutputGenerate: () => void;
  titleRender: (nodeData: {
    name: string;
    schema?: SchemaType;
    type?: string;
  }) => React.ReactElement;
  renderTypeInput: (output: OutputItem) => React.ReactElement;
  addUniqueComponentToProperties: (schemasArray: OutputItem[]) => OutputItem[];
  renderTypeOneClickUpdate: () => React.ReactElement | null;
  handleAddInputLine: () => void;
  handleRemoveInputLine: (inputId: string) => void;
  nodeType: string;
  isConnectable: boolean;
  nodeParam: Record<string, unknown>;
  canvasesDisabled: boolean;
  isStartNode: boolean;
  hasTargetHandle: boolean;
  hasSourceHandle: boolean;
  sourceHandleId?: string;
  exceptionHandleId?: string;
  model?: {
    llmId?: string;
    [key: string]: unknown;
  };
  nodeIcon?: string;
  nodeDesciption: string;
  isIteratorStart: boolean;
  isIteratorEnd: boolean;
  isKnowledgeNode: boolean;
  isQuestionAnswerNode: boolean;
  isDecisionMakingNode: boolean;
  isIfElseNode: boolean;
  isIteratorNode: boolean;
  isIteratorChildNode: boolean;
  isAgentNode: boolean;
  isStartOrEndNode: boolean;
  isRpaNode?: boolean;
  isCodeNode: boolean;
  showInputs: boolean;
  showOutputs: boolean;
  showExceptionFlow: boolean;
  references: ReferenceItem[];
  inputs: InputItem[];
  outputs: OutputItem[];
  showNodeOperation: boolean;
  currentNode?: {
    id: string;
    type?: string;
    data?: NodeDataType;
    [key: string]: unknown;
  };
  models: Array<{
    llmId?: string;
    [key: string]: unknown;
  }>;
  outputTypeList: Array<{
    label: string;
    value: string;
    children?: Array<{
      label: string;
      value: string;
    }>;
  }>;
  isThinkModel: boolean;
  inputLabel: string;
  outputLabel: string;
  allowAddInput: boolean;
  allowAddOutput: boolean;
}

export interface UseFlowCommonReturn {
  startWorkflowKeydownEvent: boolean;
  startIterativeWorkflowKeydownEvent: boolean;
  handleAddNode: (
    addNode: AddNodeType,
    position: PositionType
  ) => NewNodeType[] | null;
  handleAddToolNode: (tool: ToolType) => void;
  handleAddFlowNode: (flow: FlowType) => void;
  handleAddRpaNode: (rpa: RpaNodeParam) => void;
  handleEdgeAddNode: (
    addNode: AddNodeType,
    position: PositionType,
    sourceHandle: string | null,
    currentNode: NewNodeType
  ) => void;
  handleDebugger: () => void;
  resetBeforeAndWillNode: () => void;
}

export interface UseNodeHandleReturn {
  isConnectable: boolean;
  hasSourceHandle: boolean;
  hasTargetHandle: boolean;
  sourceHandleId?: string;
  exceptionHandleId?: string;
}

export interface UseNodeInputRenderReturn {
  allowNoInputParams: boolean;
  renderTypeInput: (output: OutputItem) => React.ReactElement;
  handleChangeInputParam: (
    inputId: string,
    fn: (data: InputItem, value: unknown) => void,
    value: unknown
  ) => void;
  handleAddInputLine: () => void;
  handleRemoveInputLine: (inputId: string) => void;
}

export interface UseVariableMemoryHandlersReturn {
  updateVariableMemoryNodeRef: () => void;
  handleChangeParam: (
    outputId: string,
    fn: (data: InputItem, value: unknown) => void,
    value: unknown
  ) => void;
  handleRemoveInputLine: (inputId: string) => void;
}

export interface UseAddNodeReturn {
  handleAddNode: (
    addNode: AddNodeType,
    position: PositionType
  ) => NewNodeType[] | null;
}

export interface UseAddToolNodeReturn {
  handleAddToolNode: (tool: ToolType) => void;
}

export interface UseAddFlowNodeReturn {
  handleAddFlowNode: (flow: FlowType) => void;
}

export interface UseAddRpaNodeReturn {
  handleAddRpaNode: (rpa: RpaNodeParam) => void;
}

// 重新导出常用的类型以便在hooks中使用
export type {
  AddNodeType,
  ToolType,
  FlowType,
  PositionType,
  NewNodeType,
} from '../drawer/chat-debugger';
