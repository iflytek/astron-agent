import type { WorkflowNodeData } from '../domain';
// Agent Node 相关类型定义
import React from 'react';
import { McpTabType, McpOperateType, McpItem } from '../modal/add-mcp';
import { NodeType } from '../zustand/flow';
export interface AgentProps {
  data: AgentNodeData;
}

export interface AgentDetailProps {
  id: string;
  data: AgentNodeData;
  nodeParam: AgentNodeParam;
}

export interface AgentNodeData extends WorkflowNodeData {
  nodeParam: AgentNodeParam;
}

export interface AgentNodeParam {
  agentId?: number;
  agentName?: string;
  agentIdErrMsg?: string;
}

export interface AgentStrategy {
  code: string;
  name: string;
  description: string;
}

export interface useAddMcpType {
  currentTab: McpTabType;
  setCurrentTab: React.Dispatch<React.SetStateAction<McpTabType>>;
  toolOperate: McpOperateType;
  setToolOperate: React.Dispatch<React.SetStateAction<McpOperateType>>;
  handleAddToolNodeThrottle: (tool: McpItem) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  dataSource: McpItem[];
  setDataSource: (dataSource: McpItem[]) => void;
  handleClearMCPData: () => void;
  handleChangeTab: (tab: McpTabType) => void;
  currentMcpInfo: McpItem;
  setCurrentMcpInfo: (currentMcpInfo: McpItem) => void;
  getMcpServerList: () => void;
  renderParamsTooltip: (data: McpItem) => React.ReactNode;
  toolsNode: NodeType[];
  closeMCPModal: () => void;
  expandedKeys: string[];
  setExpandedKeys: (expandedKeys: string[]) => void;
}
