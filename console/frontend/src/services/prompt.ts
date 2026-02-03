import http from '@/utils/http';

// 通用响应结构
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// ============ API 函数 ============

// 获取 LLM 流程列表
export async function getFlowListByLLM(): Promise<unknown> {
  return http.get('/workflow/get-list-by-LLM?search=');
}

// 创建 Prompt 分组
export async function createPromptGroup(
  params: Record<string, unknown>
): Promise<unknown> {
  return http.post('/prompt/manage/create-group', params);
}

// 获取 Agent 模版列表
export async function getAgentPromptList(
  params: Record<string, unknown>
): Promise<unknown[]> {
  return http.get('/workflow/agent-node/prompt-template', { params });
}

// 获取 Workflow Prompt 状态
export async function getWorkflowPromptStatus(id: string): Promise<unknown> {
  return http.get(`/workflow/get-workflow-prompt-status?id=${id}`);
}

// 更新 Prompt
export async function updatePrompt(
  params: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return http.post('/prompt/manage/rename', params);
}

// 保存 Workflow 比较
export async function workflowSaveComparisons(
  params: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return http.post('/workflow/save-comparisons', params);
}

// 获取 Workflow 比较列表
export async function workflowListComparisons(
  promptId: string
): Promise<unknown[]> {
  return http.get(`/workflow/list-comparisons?promptId=${promptId}`);
}
