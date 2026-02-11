// Add Flow Modal 相关类型定义

// 流程列表项接口
export interface FlowListItem {
  id: string;
  name: string;
  flowId: string;
  createTime?: string;
  updateTime?: string;
  ioInversion?: {
    inputs?: Array<{
      id: string;
      name: string;
    }>;
    outputs?: Array<{
      id: string;
      name: string;
    }>;
  };
  [key: string]: unknown;
}

// 获取流程列表的请求参数接口
export interface GetFlowsParams {
  current: number;
  pageSize: number;
  search?: string;
  status: number;
  flowId?: string;
}

// 获取流程列表的响应接口
export interface GetFlowsResponse {
  pageData: FlowListItem[];
  [key: string]: unknown;
}

// 流程节点数据接口
export interface FlowNodeData {
  nodeParam?: {
    flowId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// 流程节点接口
export interface FlowNode {
  id: string;
  nodeType?: string;
  data?: FlowNodeData;
  [key: string]: unknown;
}

// Modal 组件的 Props 接口（如果需要的话）
export interface AddFlowModalProps {
  // 可以为空，因为组件目前没有 props
}
