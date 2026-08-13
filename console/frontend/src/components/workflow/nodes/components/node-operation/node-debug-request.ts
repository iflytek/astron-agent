import axios from 'axios';

export interface NodeDebugRequest {
  requestId: number;
  controller: AbortController;
  workflowIdentity: string;
}

export interface NodeDebugRequestCoordinator {
  start: (
    workflowIdentity?: string,
    onSuperseded?: () => void
  ) => NodeDebugRequest;
  isLatest: (requestId: number, workflowIdentity?: string) => boolean;
  finish: (requestId: number) => boolean;
  invalidate: (requestId?: number) => boolean;
}

export interface WorkflowIdentitySource {
  id?: unknown;
  flowId?: unknown;
  routeIdentity?: unknown;
}

export interface NodeDebugStatePatch<TDebuggerResult = unknown> {
  status: string;
  debuggerResult?: TDebuggerResult;
}

interface DebuggableNode<TData extends Record<string, unknown>> {
  data: TData;
}

interface NodeDebugInput extends Record<string, unknown> {
  id?: unknown;
  schema?: unknown;
}

interface ExecuteNodeDebugRequestOptions<TResult> {
  coordinator?: NodeDebugRequestCoordinator;
  workflowIdentity: string;
  isWorkflowCurrent: (workflowIdentity: string) => boolean;
  flushCurrentFlow: () => Promise<void>;
  request: (signal: AbortSignal) => Promise<TResult>;
  onRunning?: (request: NodeDebugRequest) => void;
  onSuccess: (result: TResult, request: NodeDebugRequest) => void;
  onFailure: (error: unknown, request: NodeDebugRequest) => void;
  onFlushFailure: (error: unknown, request: NodeDebugRequest) => void;
  onSuperseded?: (request: NodeDebugRequest) => void;
  onSettled?: (request: NodeDebugRequest) => void;
}

export interface NodeDebugExecution {
  request: NodeDebugRequest;
  completion: Promise<void>;
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
 * Apply only transient debugger fields to the latest store node. This avoids
 * restoring the stale node snapshot captured when the request was started.
 */
export const mergeNodeDebugState = <
  TData extends Record<string, unknown>,
  TNode extends DebuggableNode<TData>,
  TDebuggerResult = unknown,
>(
  latestNode: TNode,
  patch: NodeDebugStatePatch<TDebuggerResult>
): TNode =>
  ({
    ...latestNode,
    data: {
      ...latestNode.data,
      status: patch.status,
      ...(patch.debuggerResult === undefined
        ? {}
        : { debuggerResult: patch.debuggerResult }),
    },
  }) as TNode;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const mergeDebugInput = (
  latestInput: NodeDebugInput,
  requestedInput: NodeDebugInput
): NodeDebugInput => {
  const latestSchema = asRecord(latestInput.schema);
  const requestedSchema = asRecord(requestedInput.schema);
  const latestValue = asRecord(latestSchema?.value);
  const requestedValue = asRecord(requestedSchema?.value);
  return {
    ...latestInput,
    ...(latestSchema || requestedSchema
      ? {
          schema: {
            ...latestSchema,
            ...(requestedSchema &&
            Object.prototype.hasOwnProperty.call(requestedSchema, 'type')
              ? { type: requestedSchema.type }
              : {}),
            ...(latestValue || requestedValue
              ? {
                  value: {
                    ...latestValue,
                    ...(requestedValue &&
                    Object.prototype.hasOwnProperty.call(requestedValue, 'type')
                      ? { type: requestedValue.type }
                      : {}),
                    ...(requestedValue &&
                    Object.prototype.hasOwnProperty.call(
                      requestedValue,
                      'content'
                    )
                      ? { content: requestedValue.content }
                      : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
  };
};

/**
 * Rebuild the debug node from the post-flush store snapshot while retaining
 * only the transient input values selected in the debug drawer.
 */
export const mergeNodeDebugRequest = <
  TData extends Record<string, unknown>,
  TNode extends DebuggableNode<TData>,
>(
  latestNode: TNode,
  originalNode: TNode,
  requestedNode: TNode
): TNode => {
  const latestInputs = Array.isArray(latestNode.data.inputs)
    ? (latestNode.data.inputs as NodeDebugInput[])
    : [];
  const originalInputs = Array.isArray(originalNode.data.inputs)
    ? (originalNode.data.inputs as NodeDebugInput[])
    : [];
  const requestedInputs = Array.isArray(requestedNode.data.inputs)
    ? (requestedNode.data.inputs as NodeDebugInput[])
    : [];
  const requestedById = new Map(
    requestedInputs.map(input => [String(input.id ?? ''), input])
  );
  const refOverrideIds = new Set(
    originalInputs
      .filter(input => {
        const schema = asRecord(input.schema);
        const value = asRecord(schema?.value);
        return value?.type === 'ref';
      })
      .map(input => String(input.id ?? ''))
  );
  const hasRefOverrides = refOverrideIds.size > 0;
  const inputs = latestInputs
    .map(latestInput => {
      const id = String(latestInput.id ?? '');
      const requestedInput = requestedById.get(id);
      return refOverrideIds.has(id) && requestedInput
        ? mergeDebugInput(latestInput, requestedInput)
        : latestInput;
    })
    .filter(input => {
      const schema = asRecord(input.schema);
      const value = asRecord(schema?.value);
      const content = value?.content;
      return hasRefOverrides
        ? (typeof content === 'string' && Boolean(content)) ||
            typeof content !== 'string'
        : Boolean(content);
    });

  return {
    ...latestNode,
    data: {
      ...latestNode.data,
      inputs,
    },
  };
};

export const createNodeDebugRequestCoordinator =
  (): NodeDebugRequestCoordinator => {
    let nextRequestId = 0;
    let activeRequest: NodeDebugRequest | null = null;
    let activeOnSuperseded: (() => void) | undefined;

    return {
      start: (workflowIdentity = '', onSuperseded): NodeDebugRequest => {
        if (activeRequest) {
          activeRequest.controller.abort();
          activeOnSuperseded?.();
        }
        const request = {
          requestId: ++nextRequestId,
          controller: new AbortController(),
          workflowIdentity,
        };
        activeRequest = request;
        activeOnSuperseded = onSuperseded;
        return request;
      },
      isLatest: (requestId, workflowIdentity) =>
        activeRequest?.requestId === requestId &&
        (workflowIdentity === undefined ||
          activeRequest.workflowIdentity === workflowIdentity),
      finish: (requestId): boolean => {
        if (activeRequest?.requestId !== requestId) return false;
        activeRequest = null;
        activeOnSuperseded = undefined;
        return true;
      },
      invalidate: (requestId): boolean => {
        if (
          !activeRequest ||
          (requestId !== undefined && activeRequest.requestId !== requestId)
        ) {
          return false;
        }
        activeRequest.controller.abort();
        activeRequest = null;
        activeOnSuperseded = undefined;
        return true;
      },
    };
  };

// Node operation controls are rendered once per node, so request ownership
// must be shared across component instances. Starting node B invalidates all
// callbacks from node A as well as repeated requests for the same node.
export const nodeDebugRequestCoordinator = createNodeDebugRequestCoordinator();

/**
 * Start ownership synchronously so a repeated click cancels its predecessor,
 * then wait for the authoritative draft-save barrier before changing UI state
 * or issuing the debug request.
 */
export const executeNodeDebugRequest = <TResult>(
  options: ExecuteNodeDebugRequestOptions<TResult>
): NodeDebugExecution => {
  const coordinator = options.coordinator ?? nodeDebugRequestCoordinator;
  let requestStarted = false;
  const request = coordinator.start(options.workflowIdentity, () => {
    if (requestStarted && options.isWorkflowCurrent(request.workflowIdentity)) {
      options.onSuperseded?.(request);
    }
  });
  const isCurrent = (): boolean =>
    coordinator.isLatest(request.requestId, request.workflowIdentity) &&
    options.isWorkflowCurrent(request.workflowIdentity);

  const completion = (async (): Promise<void> => {
    try {
      try {
        await options.flushCurrentFlow();
      } catch (error: unknown) {
        if (isCurrent()) options.onFlushFailure(error, request);
        return;
      }

      if (!isCurrent()) return;
      requestStarted = true;
      options.onRunning?.(request);

      try {
        const result = await options.request(request.controller.signal);
        if (isCurrent()) options.onSuccess(result, request);
      } catch (error: unknown) {
        if (isCurrent()) options.onFailure(error, request);
      }
    } finally {
      if (coordinator.finish(request.requestId)) {
        options.onSettled?.(request);
      }
    }
  })();

  return { request, completion };
};

export const isNodeDebugCancellation = (
  error: unknown,
  signal: AbortSignal
): boolean => signal.aborted || axios.isCancel(error);
