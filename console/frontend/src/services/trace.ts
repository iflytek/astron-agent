import http from '@/utils/http';
import { message } from 'antd';

export type WorkflowTraceUsage = {
  questionTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type WorkflowTraceExecutionItem = {
  sid: string;
  flowId: string;
  flowName?: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: unknown;
  usage?: WorkflowTraceUsage;
};

export type WorkflowTraceNode = {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  nextLogIds?: string[];
  startTime: number;
  endTime: number;
  duration: number;
  firstFrameDuration?: number;
  status: unknown;
  rawStatus?: Record<string, unknown>;
  usage?: WorkflowTraceUsage;
  input?: Record<string, unknown>;
  config?: Record<string, unknown>;
  output?: Record<string, unknown>;
  logs?: string[];
};

export type WorkflowTraceExecutionDetail = {
  execution: WorkflowTraceExecutionItem;
  nodes: WorkflowTraceNode[];
};

export async function getWorkflowTraceExecutions(
  flowId: string,
  params: {
    appId?: string;
    chatId?: string;
    startTime?: number;
    endTime?: number;
    page?: number;
    pageSize?: number;
  }
) {
  try {
    const data: any = await http.get(
      `/publish/workflows/${flowId}/trace/executions`,
      { params }
    );
    return data as {
      list: WorkflowTraceExecutionItem[];
      total: number;
    };
  } catch (error: any) {
    message.error(error?.message ?? '获取工作流 Trace 执行记录失败');
    throw error;
  }
}

export async function getWorkflowTraceExecutionDetail(
  flowId: string,
  sid: string,
  params: { appId?: string } = {}
) {
  try {
    const data: any = await http.get(
      `/publish/workflows/${flowId}/trace/executions/${sid}`,
      { params }
    );
    return data as WorkflowTraceExecutionDetail;
  } catch (error: any) {
    message.error(error?.message ?? '获取工作流 Trace 详情失败');
    throw error;
  }
}
