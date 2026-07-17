export interface PageData<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  pageData: T[];
}

export interface WorkflowAutomationTask {
  id: number;
  taskName: string;
  flowId: string;
  workflowName?: string;
  version?: string;
  spaceId?: number;
  uid: string;
  cronExpression: string;
  scheduleType?: string;
  timezone: string;
  inputParams?: string;
  enabled: boolean;
  deleted?: boolean;
  nextFireTime?: string | number;
  lastRunTime?: string | number;
  lastRunStatus?: AutomationRunStatus;
  lastRunMessage?: string;
  createTime?: string | number;
  updateTime?: string | number;
}

export type AutomationRunStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'RUNNING';

export interface WorkflowAutomationRun {
  id: number;
  taskId: number;
  flowId: string;
  uid: string;
  triggerType: 'SCHEDULE' | 'MANUAL';
  scheduledFireTime?: string | number;
  startTime?: string | number;
  endTime?: string | number;
  status: AutomationRunStatus;
  requestParams?: string;
  responseSummary?: string;
  errorMessage?: string;
  durationMs?: number;
  createTime?: string | number;
}

export interface WorkflowAutomationTaskPayload {
  taskName: string;
  flowId: string;
  version?: string;
  cronExpression: string;
  scheduleType?: string;
  timezone: string;
  enabled: boolean;
  inputParams: string;
}

export interface WorkflowListItem {
  id: number;
  name: string;
  flowId: string;
  status?: number;
  updateTime?: string | number;
}

export interface WorkflowInputSchema {
  id?: string;
  name?: string;
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
    default?: unknown;
    description?: string;
  };
  type?: string;
  default?: unknown;
}
