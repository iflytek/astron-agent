import type {
  CodeRunParams,
  CodeRunResponse,
} from '@/components/workflow/types/drawer/chat-debugger';
import type { FlowType } from '@/components/workflow/types';
import type {
  WorkflowNodeCategory,
  TextNodeConfig,
} from '@/components/workflow/types/domain';
import type { AgentStrategy } from '@/components/workflow/types/nodes/agent';
import type {
  WorkflowPage,
  WorkflowListParams,
  WorkflowDialogue,
  WorkflowModelsResponse,
} from '@/types/workflow-api';
import http from '@/utils/http';
export {
  getWorkflowImportEntryStatus,
  getWorkflowImportDependencyPresentation,
  normalizeWorkflowImportResult,
  shouldShowWorkflowImportError,
  summarizeWorkflowImportReport,
  type NormalizedWorkflowImportResult,
  type WorkflowImportEntryStatus,
  type WorkflowImportDependencyKind,
  type WorkflowImportDependencyPresentation,
  type WorkflowImportReport,
  type WorkflowImportReportEntry,
  type WorkflowImportReportSummary,
  type WorkflowImportResponse,
} from './workflow-import';

export async function listFlows(
  params: WorkflowListParams
): Promise<WorkflowPage> {
  return http.get<WorkflowPage, WorkflowPage>('/workflow/list', { params });
}

export async function getFlowInputsInfo(
  flowId: string,
  version?: string
): Promise<unknown> {
  return http.get('/workflow/get-inputs-info', { params: { flowId, version } });
}

export async function createFlowAPI(params: unknown): Promise<unknown> {
  return http.post('/workflow', params);
}

export async function deleteFlowAPI(id: number): Promise<unknown> {
  return http.delete(`/workflow?id=${id}`);
}

export async function getFlowDetailAPI(id: string): Promise<FlowType> {
  return http.get<FlowType, FlowType>(`/workflow?id=${id}`);
}

export async function getFlowModelList(
  appId: string | number,
  nodeType: string | number
): Promise<WorkflowModelsResponse> {
  return http.get<WorkflowModelsResponse, WorkflowModelsResponse>(
    `/workflow/models?appId=${appId}&nodeType=${nodeType}`
  );
}

export async function copyFlowAPI(id: string | number): Promise<FlowType> {
  return http.get<FlowType, FlowType>(`/workflow/clone?id=${id}`);
}

export async function saveFlowAPI(params: unknown): Promise<FlowType> {
  return http.put<FlowType, FlowType>('/workflow', params);
}

export async function buildFlowAPI(params: unknown): Promise<unknown> {
  return http.post('/workflow/build', params);
}

export async function stopWorkflowRun(
  runId: string
): Promise<{ runId: string; status: string }> {
  return http.post(`/workflow/runs/${encodeURIComponent(runId)}/stop`);
}

export async function getDialogueAPI(
  id: string | number,
  type: number,
  version?: string
): Promise<WorkflowDialogue[]> {
  return http.get<WorkflowDialogue[], WorkflowDialogue[]>(
    '/workflow/dialog/list',
    { params: { workflowId: id, type, version } }
  );
}

export async function publishFlowAPI(params: unknown): Promise<unknown> {
  return http.post('/workflow/publish', params);
}

export async function isCanPublish(id: string | number): Promise<boolean> {
  return http.get<boolean, boolean>(`/workflow/can-publish?id=${id}`);
}

export async function checkWorkflowExecutionEligibility(
  flowId: string
): Promise<void> {
  return http.get('/workflow/execution-eligibility', { params: { flowId } });
}

export async function debugWorkflowNode(
  nodeId: string,
  params: unknown,
  signal?: AbortSignal
): Promise<unknown> {
  return http.post(
    `/workflow/node/debug/${encodeURIComponent(nodeId)}`,
    params,
    {
      signal,
    }
  );
}

export async function canPublishSetNotAPI(
  id: string | number
): Promise<unknown> {
  return http.get(`/workflow/can-publish-set-not?id=${id}`);
}

export async function codeRun(params: CodeRunParams): Promise<CodeRunResponse> {
  return http.post<CodeRunResponse, CodeRunResponse>(
    '/workflow/code/run',
    params
  );
}

export async function squareListFlows(params: unknown): Promise<unknown> {
  return http.get('/workflow/square', { params });
}

export async function copyPublicFlowAPI(params: unknown): Promise<unknown> {
  return http.post('/workflow/public-copy', params);
}

export async function addChatToSet(data: unknown): Promise<unknown> {
  return http.post('/eval/set/ver/data/change', data);
}

export async function flowsNodeTemplate(): Promise<WorkflowNodeCategory[]> {
  return http.get<WorkflowNodeCategory[], WorkflowNodeCategory[]>(
    '/workflow/node-template'
  );
}

//获取文本节点分割符列表
export async function textNodeConfigList(): Promise<TextNodeConfig[]> {
  return http.get<TextNodeConfig[], TextNodeConfig[]>('/textNode/config/list');
}

//添加文本节点分割符
export async function textNodeConfigSave(params: unknown): Promise<unknown> {
  return http.post('/textNode/config/save', params);
}

//清空文本节点分割符
export async function textNodeConfigClear(
  id: string | number
): Promise<unknown> {
  return http.get(`/textNode/config/delete?id=${id}`);
}

export async function workflowDialogClear(
  id: string | number,
  type: number
): Promise<unknown> {
  return http.post('/workflow/dialog/clear', { workflowId: id, type });
}

export async function workflowReleaseStatusList(
  flowId: string | number
): Promise<unknown> {
  return http.get(`/workflow/release/status-list?flowId=${flowId}`);
}

export async function getAiuiAgents(
  searchKey: string | number
): Promise<unknown> {
  return http.get(`/workflow/release/aiui/agent-all?searchKey=${searchKey}`);
}

//渠道发布
export async function channelPublish(params: unknown): Promise<unknown> {
  return http.post('/workflow/release', params);
}

export async function getReleaseBulletin(
  flowId: string | number
): Promise<unknown> {
  return http.get(`/workflow/release/bulletin?flowId=${flowId}`);
}

export async function getReleaseChannelInfo(
  flowId: string | number,
  channel: string | number
): Promise<unknown> {
  return http.get(
    `/workflow/release/channel-info?flowId=${flowId}&channel=${channel}`
  );
}

export async function regenAksk(params: unknown): Promise<unknown> {
  return http.post('/common/regen-aksk', params);
}

export async function getReleaseChannelStatus(
  flowId: string | number,
  channel: string | number
): Promise<unknown> {
  return http.get(
    `/workflow/release/status?flowId=${flowId}&channel=${channel}`
  );
}

export async function getAgentStrategyAPI(): Promise<AgentStrategy[]> {
  return http.get<AgentStrategy[], AgentStrategy[]>(
    '/workflow/get-agent-strategy'
  );
}

export async function getKnowledgeProStrategyAPI(): Promise<AgentStrategy[]> {
  return http.get<AgentStrategy[], AgentStrategy[]>(
    '/workflow/get-knowledge-pro-strategy'
  );
}

export async function getBotStatisticsInfoByBotld(
  botId: string | number
): Promise<unknown> {
  return http.get(`/bot/get-bot-statistics-info-by-bot-id?botId=${botId}`);
}

// 编辑已上架bot
export async function getBotUsage(params: unknown): Promise<unknown> {
  return http.post('/bot/get-use-count', params);
}

// 错误数据看板
export async function getErrorNodeList(params: unknown): Promise<unknown> {
  return http.post('/u/bot/v2/data-analysis/error-node-list', params);
}

//获取bot详情
export async function getBotInfo(params: unknown): Promise<unknown> {
  return http.post('/bot/bot-detail', params);
}

//工作流导入
export async function workflowImport(params: unknown): Promise<unknown> {
  return http.post('/workflow/import', params, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// 获取测评任务状态
export async function getEvaluateStatus(params: unknown): Promise<unknown> {
  return http.get('/eval/task/get-status', { params });
}

// 工作流一键更新
export async function getLatestWorkflow(params: {
  flowId: string;
}): Promise<FlowType> {
  return http.get<FlowType, FlowType>('/workflow/get-max-version', { params });
}

//workflow上传流式图片接口
export async function commonUploadUserIcon(params: unknown): Promise<unknown> {
  return http.post('/common/upload/user-icon', params, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

//Workflow导出
export async function workflowExport(id: string | number): Promise<unknown> {
  return http.get(`/workflow/export/${id}`);
}
