import type { WorkflowNodeError } from './domain';
import type {
  WorkflowNode,
  WorkflowNodeData,
  WorkflowInput,
  WorkflowOutput,
  WorkflowReference,
} from './domain';

import React from 'react';

export type NodeType = WorkflowNode;

export type NodeDataType = WorkflowNodeData;

export type InputType = WorkflowInput;

export type OutputType = WorkflowOutput;

export type ReferenceType = WorkflowReference;

export type sourceHandleType = {
  dataType: string;
  id: string;
  baseClasses: string[];
};

export type targetHandleType = {
  inputTypes?: string[];
  type: string;
  fieldName: string;
  id: string;
  proxy?: { field: string; id: string };
};

export type FlowType = {
  name?: string | undefined;
  flowId?: string;
  appId?: string;
  id?: string;
  data?: string;
  publishedData?: string;
  originData?: string;
  description?: string;
  updateTime?: string;
  createTime?: string;
  type?: number;
  style?: unknown;
  is_component?: boolean;
  parent?: string;
  date_created?: string;
  updated_at?: string;
  last_tested_version?: string;
  address: string;
  avatarIcon: string;
  status: number;
  color: string;
  category?: string | number | null;
  edgeType: string;
  evalSetId?: string;
  evalPageFirstTime?: boolean;
  canPublish?: boolean;
  editing?: boolean;
  backgroundPic?: string;
  advancedConfig?: string;
  version?: string;
  bindAiuiAgent?: boolean;
  inputExampleList?: string[];
  flowConfig?: string;
  ext?: string;
  ioInversion?: { inputs: WorkflowInput[]; outputs: WorkflowOutput[] };
};

export type ErrNodeType = WorkflowNodeError;

export type ConnectionLineProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  connectionLineStyle?: React.CSSProperties;
};

export type UseDropdownControlReturn = {
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleDropdownKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
};

export type UseFlowTemplateEditorReturn = {
  insertOption: (option: string, isLeaf: boolean) => void;
  getCursorPosition: () => void;
  filterArr: (
    arr: string[],
    value: string,
    offset: number,
    content: string
  ) => string[];
  noProperties: boolean;
  hasData: boolean;
  inputsOption: string[];
};

export type UseFlowTemplateInputReturn = {
  handleClick: () => void;
  handleInput: () => void;
  handleTreeSelect: (selectedKeys: string[]) => void;
};

// 导出 Drawer 相关类型
export * from './drawer';

// 导出 Hooks 相关类型
export * from './hooks';

// 导出 Modal 相关类型
export * from './modal';

// 导出 Nodes 相关类型
export * from './nodes';

// 导出 Components 相关类型
export * from './components';
export type { ChatStoreType } from './zustand/chat';
