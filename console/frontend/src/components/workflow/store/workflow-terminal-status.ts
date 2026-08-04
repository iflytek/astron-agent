type TerminalDebuggerResult = {
  cancelReason?: string;
  [key: string]: unknown;
};

export type TerminalNode = {
  data: {
    status?: string;
    debuggerResult?: TerminalDebuggerResult;
    [key: string]: unknown;
  };
};

export const settleRunningNodes = <T extends TerminalNode>(
  nodes: T[],
  succeeded: boolean,
  cancellationReason: string
): T[] =>
  nodes.map(node => {
    if (node.data.status !== 'running') return node;

    const { cancelReason: _cancelReason, ...debuggerResult } =
      node.data.debuggerResult ?? {};
    return {
      ...node,
      data: {
        ...node.data,
        status: succeeded ? 'success' : 'cancel',
        debuggerResult: succeeded
          ? debuggerResult
          : { ...debuggerResult, cancelReason: cancellationReason },
      },
    } as T;
  });
