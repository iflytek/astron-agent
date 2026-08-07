import http from '@/utils/http';
import type {
  PageData,
  WorkflowAutomationRun,
  WorkflowAutomationTask,
  WorkflowAutomationTaskPayload,
} from '@/types/automation';

interface AutomationPageParams {
  current: number;
  pageSize: number;
  search?: string;
  enabled?: boolean;
}

export async function getAutomationTasks(
  params: AutomationPageParams
): Promise<PageData<WorkflowAutomationTask>> {
  return http.get('/workflow/automation/page', {
    params,
  }) as unknown as Promise<PageData<WorkflowAutomationTask>>;
}

export async function createAutomationTask(
  payload: WorkflowAutomationTaskPayload
): Promise<WorkflowAutomationTask> {
  return http.post(
    '/workflow/automation',
    payload
  ) as unknown as Promise<WorkflowAutomationTask>;
}

export async function updateAutomationTask(
  id: number,
  payload: WorkflowAutomationTaskPayload
): Promise<WorkflowAutomationTask> {
  return http.put(
    `/workflow/automation/${id}`,
    payload
  ) as unknown as Promise<WorkflowAutomationTask>;
}

export async function setAutomationEnabled(
  id: number,
  enabled: boolean
): Promise<WorkflowAutomationTask> {
  return http.post(`/workflow/automation/${id}/enable`, {
    enabled,
  }) as unknown as Promise<WorkflowAutomationTask>;
}

export async function deleteAutomationTask(id: number): Promise<boolean> {
  return http.delete(
    `/workflow/automation/${id}`
  ) as unknown as Promise<boolean>;
}

export async function getAutomationRuns(
  id: number,
  params: { current: number; pageSize: number }
): Promise<PageData<WorkflowAutomationRun>> {
  return http.get(`/workflow/automation/${id}/runs`, {
    params,
  }) as unknown as Promise<PageData<WorkflowAutomationRun>>;
}

export async function previewAutomationCron(payload: {
  cronExpression: string;
  timezone: string;
}): Promise<string[]> {
  return http.post(
    '/workflow/automation/cron/preview',
    payload
  ) as unknown as Promise<string[]>;
}

export async function runAutomationNow(
  id: number
): Promise<WorkflowAutomationRun> {
  return http.post(
    `/workflow/automation/${id}/run-now`
  ) as unknown as Promise<WorkflowAutomationRun>;
}
