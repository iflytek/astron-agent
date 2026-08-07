import React from 'react';
// Add Plugin Modal 相关类型定义

// 分页接口
export interface Pagination {
  page: number;
  pageSize: number;
}

// 工具参数接口
export interface ToolParam {
  id: string;
  name: string;
  type: string;
  description?: string;
  [key: string]: unknown;
}

// 工具项接口
export interface ToolListItem {
  id: string;
  name: string;
  description?: string;
  toolId?: string;
  updateTime?: string;
  webSchema?: string;
  address?: string;
  icon?: string;
  avatarColor?: string;
  params?: ToolParam[];
  [key: string]: unknown;
}

// 机器人图标接口
export interface BotIcon {
  [key: string]: unknown;
}

// 标签类型
export type PluginTabType = 'offical' | 'person' | '';

// 工具操作类型
export type ToolOperateType = '' | 'create' | 'edit' | 'test' | 'detail';

// 当前工具信息接口
export interface CurrentToolInfo {
  id?: string;
  [key: string]: unknown;
}

// 工具列表响应接口
export interface ToolListResponse {
  pageData: unknown[];
  totalCount: number;
  [key: string]: unknown;
}

// 获取工具列表参数接口
export interface GetToolsParams extends Pagination {
  content?: string;
  status?: number;
  orderFlag?: number;
}

// 工具节点接口
export interface ToolNode {
  id: string;
  nodeType?: string;
  data?: {
    nodeParam?: {
      pluginId?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Modal 组件的 Props 接口（如果需要的话）
export interface AddPluginModalProps {
  // 可以为空，因为组件目前没有 props
}

export interface useAddPluginType {
  loader: null | HTMLDivElement;
  loadingRef: boolean;
  toolRef: HTMLDivElement | null;
  currentTab: string;
  setCurrentTab: (currentTab: string) => void;
  toolOperate: ToolOperateType;
  setToolOperate: (toolOperate: ToolOperateType) => void;
  orderFlag: number;
  setOrderFlag: (orderFlag: number) => void;
  handleAddToolNodeThrottle: (tool: ToolListItem) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  hasMore: boolean;
  pagination: Pagination;
  setPagination: (pagination: Pagination) => void;
  searchValue: string;
  setSearchValue: (searchValue: string) => void;
  dataSource: ToolListItem[];
  setDataSource: (dataSource: ToolListItem[]) => void;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  operateId: string;
  setOperateId: (operateId: string) => void;
  getPersonTools: () => void;
  getOfficalTools: () => void;
  handleClearData: () => void;
  handleChangeTab: (tab: PluginTabType) => void;
  currentToolInfo: ToolListItem;
  setCurrentToolInfo: (currentToolInfo: ToolListItem) => void;
}
