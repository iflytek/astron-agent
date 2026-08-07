import { XYPosition } from 'reactflow';
import React from 'react';

export type NodeType = {
  id: string;
  type?: string;
  position: XYPosition;
  data: NodeDataType;
  selected?: boolean;
};

export type NodeDataType = {
  nodeMeta: {
    nodeType: string;
    aliasName: string;
  };
  inputs?: Array<InputType>;
  outputs?: Array<OutputType>;
  nodeParam: {
    model: string;
    domain: string;
    appId: string;
    apiKey: string;
    apiSecret: string;
    maxTokens: string;
    uid: string;
    template: string;
  };
  references?: Array<ReferenceType>;
};

export type InputType = {
  id: string;
  name: string;
  schema: {
    type: string;
    value: {
      type: string;
      content:
        | string
        | {
            id: string;
            nodeId: string;
            name: string;
          };
    };
  };
};

export type OutputType = {
  id: string;
  name: string;
  schema: {
    type: string;
    value: {
      type: string;
      content: string;
    };
  };
};

export type ReferenceType = {
  id?: string;
  label: string;
  value: string;
  children: ReferenceType;
};

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
  data?: unknown;
  publishedData?: unknown;
  description?: string;
  updateTime?: unknown;
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
  edgeType: string;
  evalSetId?: string;
  evalPageFirstTime?: boolean;
  canPublish?: boolean;
  editing?: boolean;
  backgroundPic?: string;
  advancedConfig?: unknown;
};

export type ErrNodeType = {
  id: string;
  icon: string;
  name: string | undefined;
  errorMsg: string;
  childErrList: ErrNodeType[] | undefined;
  data?: {
    label: string;
  };
};

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
