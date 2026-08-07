import React, { SetStateAction } from 'react';

// Add Knowledge Modal 相关类型定义

// 知识库项接口
export interface KnowledgeItem {
  id: string;
  name: string;
  description?: string;
  corner?: string;
  createTime?: string;
  updateTime?: string;
  tag?: string;
  coreRepoId?: string;
  outerRepoId?: string;
  [key: string]: unknown;
}

// 知识库列表项接口
export interface KnowledgeListItem {
  id: string;
  tag?: string;
  [key: string]: unknown;
}

// 获取知识库列表的请求参数接口
export interface GetKnowledgesParams {
  pageNo: number;
  pageSize: number;
  content?: string;
  orderBy?: string;
  tag?: string;
}

// 获取知识库列表的响应接口
export interface GetKnowledgesResponse {
  pageData: KnowledgeItem[];
  [key: string]: unknown;
}

// 排序类型
export type OrderByType = 'create_time' | 'update_time';

// 版本类型
export type VersionType = 'AIUI-RAG2' | 'CBG-RAG' | 'SparkDesk-RAG';

// 节点数据接口
export interface NodeData {
  nodeParam: {
    repoList?: KnowledgeListItem[];
    repoId?: string[];
    ragType?: string;
    [key: string]: unknown;
  };
  outputs?: unknown[];
  [key: string]: unknown;
}

// 节点接口
export interface NodeItem {
  id: string;
  data: NodeData;
  [key: string]: unknown;
}

// Modal 组件的 Props 接口（如果需要的话）
export interface AddKnowledgeModalProps {
  // 可以为空，因为组件目前没有 props
}

export interface useAddKnowledgeProps {
  tag: string | undefined;
  setTag: (tag: SetStateAction<VersionType | undefined>) => void;
  orderBy: OrderByType;
  versionList: { label: string; value: string }[];
  getKnowledgesDebounce: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKnowledgesChange: (knowledge: KnowledgeItem) => void;
  ragType: string;
  checkedIds: string[];
  allData: KnowledgeItem[];
  setAllData: (allData: KnowledgeItem[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setOrderBy: (orderBy: OrderByType) => void;
}
