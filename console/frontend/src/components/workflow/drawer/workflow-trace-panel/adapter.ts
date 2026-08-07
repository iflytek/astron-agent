import type {
  FlattenTraceNode,
  TraceExecutionSummary,
  TraceStatus,
  TraceTreeNode,
  WorkflowTraceExecutionDetail,
  WorkflowTraceExecutionItem,
  WorkflowTraceNode,
} from './types';

const statusMap: Record<string, TraceStatus> = {
  success: 'success',
  running: 'running',
  failed: 'failed',
};

const isErrorText = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('error') ||
    normalized.includes('failed') ||
    normalized.includes('failure') ||
    normalized.includes('exception')
  );
};

const normalizeStatus = (status?: unknown): TraceStatus => {
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (statusMap[normalized]) {
      return statusMap[normalized];
    }
    if (isErrorText(normalized)) {
      return 'failed';
    }
  }

  if (status && typeof status === 'object') {
    const code = Number((status as { code?: unknown }).code ?? 0);
    if (Number.isFinite(code)) {
      if (code === 0 || code === 200) {
        return 'success';
      }
      if (code > 0) {
        return 'failed';
      }
    }

    const message = String((status as { message?: unknown }).message ?? '');
    if (message && isErrorText(message)) {
      return 'failed';
    }
  }

  return 'running';
};

const extractModelName = (node: WorkflowTraceNode): string | undefined => {
  const inputModel =
    typeof node.input?.model === 'string' ? (node.input.model as string) : '';
  const outputModel =
    typeof node.output?.model === 'string' ? (node.output.model as string) : '';
  const config = node.config || {};
  const configModelName =
    typeof config.model_name === 'string' ? config.model_name : '';
  const configModel = typeof config.model === 'string' ? config.model : '';
  const configDomain = typeof config.domain === 'string' ? config.domain : '';

  return (
    configModelName ||
    configModel ||
    configDomain ||
    inputModel ||
    outputModel ||
    undefined
  );
};

const isModelDrivenNode = (node: WorkflowTraceNode): boolean => {
  const config = node.config || {};
  const configModelName =
    typeof config.model_name === 'string' ? config.model_name.trim() : '';

  return Boolean(configModelName);
};

const getUsage = (usage?: {
  questionTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}): {
  questionTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} => ({
  questionTokens: usage?.questionTokens ?? 0,
  promptTokens: usage?.promptTokens ?? 0,
  completionTokens: usage?.completionTokens ?? 0,
  totalTokens: usage?.totalTokens ?? 0,
});

const HIDDEN_MODEL_CONFIG_KEYS = new Set([
  'url',
  'base_url',
  'apikey',
  'apisecret',
  'appid',
  'source',
  'node_id',
  'uid',
]);

const sanitizeModelConfig = (
  value: unknown
): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => !HIDDEN_MODEL_CONFIG_KEYS.has(key.toLowerCase())
    )
  );
};

const buildModelChildOutput = (
  node: WorkflowTraceNode
): Record<string, unknown> => ({
  usage: getUsage(node.usage),
  output: node.output || {},
});

const toTraceNode = (
  execution: WorkflowTraceExecutionItem,
  node: WorkflowTraceNode,
  displayId: string
): TraceTreeNode => {
  const usage = getUsage(node.usage);

  return {
    id: displayId,
    name: node.nodeName || node.nodeId || 'Unnamed Node',
    type: node.nodeType || 'unknown',
    kind: 'node',
    status: normalizeStatus(node.status),
    rawStatus: node.rawStatus,
    duration: node.duration || 0,
    offset: Math.max((node.startTime || 0) - (execution.startTime || 0), 0),
    totalTokens: usage.totalTokens,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    questionTokens: usage.questionTokens,
    firstFrameDuration: node.firstFrameDuration,
    input: node.input,
    config: node.config,
    output: node.output,
    logs: node.logs,
    modelName: extractModelName(node),
    selectable: true,
  };
};

const createTraceNodeWithModelChild = (
  execution: WorkflowTraceExecutionItem,
  node: WorkflowTraceNode,
  displayId: string
): TraceTreeNode => {
  const traceNode: TraceTreeNode = {
    ...toTraceNode(execution, node, displayId),
    children: [],
  };

  if (!isModelDrivenNode(node)) {
    return traceNode;
  }

  traceNode.children = [
    {
      ...traceNode,
      id: `${displayId}::model`,
      name: traceNode.modelName || '大模型详情',
      kind: 'model',
      input: sanitizeModelConfig(node.config) || {},
      output: buildModelChildOutput(node),
      children: [],
    },
  ];

  return traceNode;
};

const isIterationNode = (node: WorkflowTraceNode): boolean =>
  node.nodeId.startsWith('iteration::');

const isIterationStartNode = (node: WorkflowTraceNode): boolean =>
  node.nodeId.startsWith('iteration-node-start::');

const isIterationEndNode = (node: WorkflowTraceNode): boolean =>
  node.nodeId.startsWith('iteration-node-end::');

const buildIterationRunNode = (
  execution: WorkflowTraceExecutionItem,
  runIndex: number,
  nodes: WorkflowTraceNode[]
): TraceTreeNode => {
  const firstNode = nodes[0];
  const lastNode = nodes[nodes.length - 1];
  const totalTokens = nodes.reduce(
    (sum, node) => sum + (node.usage?.totalTokens ?? 0),
    0
  );
  const promptTokens = nodes.reduce(
    (sum, node) => sum + (node.usage?.promptTokens ?? 0),
    0
  );
  const completionTokens = nodes.reduce(
    (sum, node) => sum + (node.usage?.completionTokens ?? 0),
    0
  );
  const questionTokens = nodes.reduce(
    (sum, node) => sum + (node.usage?.questionTokens ?? 0),
    0
  );
  const status = nodes.some(node => normalizeStatus(node.status) === 'failed')
    ? 'failed'
    : nodes.some(node => normalizeStatus(node.status) === 'running')
      ? 'running'
      : 'success';

  return {
    id: `iteration-run::${firstNode?.id || runIndex}`,
    name: `第${runIndex}次`,
    type: 'iteration-run',
    kind: 'iteration-run',
    status,
    duration: Math.max(
      (lastNode?.endTime || 0) - (firstNode?.startTime || 0),
      0
    ),
    offset: Math.max(
      (firstNode?.startTime || 0) - (execution.startTime || 0),
      0
    ),
    totalTokens,
    promptTokens,
    completionTokens,
    questionTokens,
    selectable: false,
    children: nodes.map((node, index) =>
      createTraceNodeWithModelChild(
        execution,
        node,
        `${node.id}::iteration-run::${runIndex}::${index}`
      )
    ),
  };
};

export const buildExecutionOptions = (
  executions: WorkflowTraceExecutionItem[]
): TraceExecutionSummary[] =>
  executions.map(execution => ({
    id: execution.sid,
    label: new Date(execution.startTime || 0).toLocaleString(),
    totalDuration: execution.duration || 0,
    totalTokens: execution.usage?.totalTokens ?? 0,
    status: normalizeStatus(execution.status),
  }));

export const buildTraceTree = (
  detail?: WorkflowTraceExecutionDetail | null
): TraceTreeNode[] => {
  if (!detail) {
    return [];
  }

  const tree: TraceTreeNode[] = [];
  const pendingIterationRuns: WorkflowTraceNode[][] = [];
  let currentIterationRun: WorkflowTraceNode[] | undefined;

  const appendTraceNode = (node: WorkflowTraceNode, index: number): void => {
    tree.push(
      createTraceNodeWithModelChild(
        detail.execution,
        node,
        `${node.id}::${index}`
      )
    );
  };

  detail.nodes.forEach((node, index) => {
    if (isIterationStartNode(node)) {
      currentIterationRun = [node];
      return;
    }

    if (currentIterationRun) {
      currentIterationRun.push(node);

      if (isIterationEndNode(node)) {
        pendingIterationRuns.push(currentIterationRun);
        currentIterationRun = undefined;
      }
      return;
    }

    if (isIterationNode(node)) {
      const traceNode: TraceTreeNode = {
        ...toTraceNode(detail.execution, node, `${node.id}::${index}`),
        kind: 'iteration-group',
        children: pendingIterationRuns.map((runNodes, runIndex) =>
          buildIterationRunNode(detail.execution, runIndex + 1, runNodes)
        ),
      };
      tree.push(traceNode);
      pendingIterationRuns.length = 0;
      return;
    }

    appendTraceNode(node, index);
  });

  if (currentIterationRun?.length) {
    pendingIterationRuns.push(currentIterationRun);
  }

  pendingIterationRuns.forEach(runNodes => {
    runNodes.forEach((runNode, runIndex) => {
      appendTraceNode(runNode, detail.nodes.length + runIndex);
    });
  });

  return tree;
};

export const flattenNodes = (
  nodes: TraceTreeNode[],
  depth = 0
): FlattenTraceNode[] =>
  nodes.flatMap(node => [
    { ...node, depth },
    ...(node.children ? flattenNodes(node.children, depth + 1) : []),
  ]);
