export interface WorkflowIdentitySource {
  id?: unknown;
  flowId?: unknown;
  routeIdentity?: unknown;
}

export interface WorkflowAsyncRequest {
  requestId: number;
  workflowIdentity: string;
}

export interface WorkflowAsyncGuard {
  start: (workflowIdentity: string) => WorkflowAsyncRequest | undefined;
  isCurrent: (
    request: WorkflowAsyncRequest,
    currentWorkflowIdentity: string
  ) => boolean;
  finish: (request: WorkflowAsyncRequest) => boolean;
  invalidate: () => void;
}

const identityPart = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

export const createWorkflowIdentity = (
  workflow: WorkflowIdentitySource | null | undefined
): string =>
  JSON.stringify([
    identityPart(workflow?.id),
    identityPart(workflow?.flowId),
    identityPart(workflow?.routeIdentity),
  ]);

/**
 * Owns one async preflight per hook instance. A request for another workflow
 * supersedes stale work immediately, while repeated clicks for the same
 * workflow remain deduplicated until that request settles.
 */
export const createWorkflowAsyncGuard = (): WorkflowAsyncGuard => {
  let nextRequestId = 0;
  let activeRequest: WorkflowAsyncRequest | undefined;

  return {
    start: (workflowIdentity: string): WorkflowAsyncRequest | undefined => {
      if (activeRequest?.workflowIdentity === workflowIdentity) {
        return undefined;
      }
      const request = {
        requestId: ++nextRequestId,
        workflowIdentity,
      };
      activeRequest = request;
      return request;
    },
    isCurrent: (request, currentWorkflowIdentity) =>
      activeRequest?.requestId === request.requestId &&
      request.workflowIdentity === currentWorkflowIdentity,
    finish: (request: WorkflowAsyncRequest): boolean => {
      if (activeRequest?.requestId !== request.requestId) return false;
      activeRequest = undefined;
      return true;
    },
    invalidate: (): void => {
      activeRequest = undefined;
    },
  };
};
