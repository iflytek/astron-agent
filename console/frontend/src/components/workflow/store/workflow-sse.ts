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
