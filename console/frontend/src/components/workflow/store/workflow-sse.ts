interface WorkflowSseLifecycleOptions<TMessage> {
  isCurrent: () => boolean;
  finalize: () => void;
  handleMessage?: (message: TMessage) => boolean;
  onTransportError?: (error: Error) => void;
}

export interface WorkflowSseLifecycle<TMessage> {
  onClose: () => void;
  onError: (error: unknown) => never;
  onMessage: (message: TMessage) => void;
}

const normalizeError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const throwFatalWorkflowSseError = (error: unknown): never => {
  throw normalizeError(error);
};

/**
 * Synchronous controller failures arrive as one SSE frame without a core
 * workflow step or choices. Treat them as terminal so a normal stream close
 * cannot overwrite the real business error with "connection interrupted".
 */
export const isTerminalWorkflowSseErrorFrame = (
  data: Record<string, unknown> | null | undefined
): boolean => {
  const code = data?.code;
  return (
    typeof code === 'number' &&
    code !== 0 &&
    data?.workflow_step == null &&
    (!Array.isArray(data?.choices) || data.choices.length === 0)
  );
};

export const createWorkflowSseLifecycle = <TMessage = unknown>({
  isCurrent,
  finalize,
  handleMessage,
  onTransportError,
}: WorkflowSseLifecycleOptions<TMessage>): WorkflowSseLifecycle<TMessage> => {
  let completed = false;

  const finalizeIfActive = (error: Error): void => {
    if (completed || !isCurrent()) return;

    completed = true;
    onTransportError?.(error);
    finalize();
  };

  return {
    onClose(): void {
      finalizeIfActive(
        new Error('Workflow SSE connection closed before completion')
      );
    },
    onError(error: unknown): never {
      const requestError = normalizeError(error);
      finalizeIfActive(requestError);
      throw requestError;
    },
    onMessage(message: TMessage): void {
      if (completed || !isCurrent()) return;
      if (handleMessage?.(message)) {
        completed = true;
      }
    },
  };
};
