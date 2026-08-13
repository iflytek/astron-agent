export interface ActiveImportDependencyIssue {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  dependencyType: string;
  status: string;
  reason?: string;
  sourcePluginId?: string;
  sourceOperationId?: string;
  sourceVersion?: string;
  candidatePluginIds: string[];
  origin: 'nodeMeta' | 'fallback' | 'agentTool';
}

type UnknownRecord = Record<string, unknown>;

const RESOLVED_STATUSES = new Set([
  'MAPPED',
  'RESOLVED',
  'SUCCESS',
  'OK',
  'AUTO_MAPPED',
  'AUTO_RESOLVED',
]);

const ACTIVE_STATUSES = new Set([
  'AMBIGUOUS',
  'MULTIPLE_MATCHES',
  'UNRESOLVED',
  'UNRESOLVED_DEPENDENCY',
  'MISSING',
  'NO_MATCH',
  'FORBIDDEN',
  'PERMISSION_DENIED',
  'INCOMPATIBLE',
  'FAILED',
  'NOT_FOUND',
]);

const KNOWN_DEPENDENCY_TYPES = new Set([
  'plugin',
  'database',
  'workflow',
  'knowledge',
]);

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): UnknownRecord | undefined =>
  isRecord(value) ? value : undefined;

const asRecords = (value: unknown): UnknownRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const asStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map(item => toNonEmptyString(item))
        .filter((item): item is string => Boolean(item))
    : [];

const toNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

const normalizeCode = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');

const normalizeNodeType = (value: unknown): string =>
  normalizeCode(value).toLowerCase().replace(/_/g, '-');

const isResolvedStatus = (value: unknown): boolean =>
  RESOLVED_STATUSES.has(normalizeCode(value));

const markerStatus = (marker: UnknownRecord): unknown =>
  marker.status ?? marker.importDependencyStatus;

const isKnownStatus = (value: unknown): boolean => {
  const status = normalizeCode(value);
  return RESOLVED_STATUSES.has(status) || ACTIVE_STATUSES.has(status);
};

const runtimeAgentToolIds = (nodeParam: UnknownRecord): Set<string> => {
  const plugin = asRecord(nodeParam.plugin);
  const ids = new Set<string>();
  if (!plugin || !Array.isArray(plugin.tools)) return ids;
  plugin.tools.forEach(rawTool => {
    const tool = asRecord(rawTool);
    const id = toNonEmptyString(tool?.tool_id ?? rawTool);
    if (id) ids.add(id);
  });
  return ids;
};

const isAgentToolMarkerRebound = (
  markedTool: UnknownRecord,
  nodeParam: UnknownRecord
): boolean => {
  const plugin = asRecord(nodeParam.plugin);
  const runtimeIds = runtimeAgentToolIds(nodeParam);
  const markedId = toNonEmptyString(markedTool.toolId);
  if (markedId && runtimeIds.has(markedId)) return true;

  return asRecords(plugin?.toolsList).some(candidate => {
    if (candidate === markedTool || candidate.importDependencyStatus != null)
      return false;
    const candidateId = toNonEmptyString(candidate.toolId);
    if (!candidateId || !runtimeIds.has(candidateId)) return false;
    // Selecting a runtime-bound, unmarked item is an explicit replacement.
    // Do not infer identity from a display name: the server remains responsible
    // for visibility, version and compatibility validation.
    return candidateId !== markedId;
  });
};

const isAgentPluginIssueRebound = (
  nodeParam: UnknownRecord,
  issue: UnknownRecord
): boolean => {
  const plugin = asRecord(nodeParam.plugin);
  const toolsList = asRecords(plugin?.toolsList);
  const sourceId = toNonEmptyString(issue.sourcePluginId);
  const markedTool = toolsList.find(tool => {
    const toolSourceId = toNonEmptyString(tool.sourcePluginId);
    const toolId = toNonEmptyString(tool.toolId);
    return (
      tool.importDependencyStatus != null &&
      (sourceId == null || toolSourceId === sourceId || toolId === sourceId)
    );
  });

  // Removing the unresolved display item is itself an explicit user repair.
  // The server still verifies that any replacement is visible and executable.
  if (!markedTool) return true;
  return isAgentToolMarkerRebound(markedTool, nodeParam);
};

const knowledgeBindingIds = (
  nodeType: string,
  nodeParam: UnknownRecord
): Set<string> => {
  const ids = new Set<string>();
  if (nodeType === 'agent') {
    const plugin = asRecord(nodeParam.plugin);
    asRecords(plugin?.knowledge).forEach(item => {
      const match = asRecord(item.match);
      asStrings(match?.repoIds).forEach(id => ids.add(id));
    });
    return ids;
  }

  const addRepositoryObjects = (value: unknown): void => {
    asRecords(value).forEach(repo => {
      const id = toNonEmptyString(repo.repoId);
      if (id) ids.add(id);
    });
  };

  if (nodeType === 'knowledge-base') {
    const repositories = asRecords(nodeParam.repos);
    if (repositories.length > 0) {
      // Match Core: a non-empty repos binding supersedes legacy repoId.
      addRepositoryObjects(repositories);
    } else {
      asStrings(nodeParam.repoId).forEach(id => ids.add(id));
      const scalarRepoId = toNonEmptyString(nodeParam.repoId);
      if (scalarRepoId) ids.add(scalarRepoId);
    }
    return ids;
  }

  if (nodeType === 'knowledge-pro-base') {
    asStrings(nodeParam.repoIds).forEach(id => ids.add(id));
    return ids;
  }

  if (nodeType === 'knowledge-expert-base') {
    addRepositoryObjects(nodeParam.repos);
    return ids;
  }

  // A future knowledge-node kind remains guarded by the server, but a visible
  // local binding can still be submitted for authoritative validation.
  asStrings(nodeParam.repoId).forEach(id => ids.add(id));
  asStrings(nodeParam.repoIds).forEach(id => ids.add(id));
  addRepositoryObjects(nodeParam.repos);
  return ids;
};

const inferDependencyType = (node: UnknownRecord): string => {
  const nodeType = normalizeNodeType(node.nodeType ?? node.type);
  const nodeId = normalizeNodeType(node.id);
  const type = nodeType || nodeId.split('::')[0] || 'unknown';
  if (type === 'flow') return 'workflow';
  if (
    ['knowledge-base', 'knowledge-pro-base', 'knowledge-expert-base'].includes(
      type
    )
  )
    return 'knowledge';
  if (type === 'agent') return 'unknown';
  return type;
};

const hasValidMarkerShape = (
  node: UnknownRecord,
  marker: UnknownRecord,
  dependencyType: string
): boolean => {
  if (
    !KNOWN_DEPENDENCY_TYPES.has(dependencyType) ||
    !isKnownStatus(markerStatus(marker))
  ) {
    return false;
  }
  if (dependencyType === 'knowledge') {
    const nodeType = normalizeNodeType(node.nodeType ?? node.type);
    // Agent knowledge markers can represent an aggregate removed list and do
    // not carry one source ID in the current protocol.
    return (
      nodeType === 'agent' || Boolean(toNonEmptyString(marker.sourcePluginId))
    );
  }
  return Boolean(toNonEmptyString(marker.sourcePluginId));
};

const isStructurallyRebound = (
  node: UnknownRecord,
  issue: UnknownRecord
): boolean => {
  const data = asRecord(node.data);
  const nodeParam = asRecord(data?.nodeParam) ?? {};
  const nodeType = normalizeNodeType(node.nodeType ?? node.type);
  const dependencyType =
    normalizeCode(issue.dependencyType).toLowerCase() ||
    inferDependencyType(node);
  const sourceId = toNonEmptyString(issue.sourcePluginId);

  switch (dependencyType) {
    case 'plugin': {
      if (nodeType === 'agent')
        return isAgentPluginIssueRebound(nodeParam, issue);
      const pluginId = toNonEmptyString(nodeParam.pluginId);
      const operationId = toNonEmptyString(nodeParam.operationId);
      // A complete binding, including one restored under the original ID, is
      // delegated to the server's authoritative visibility/contract guard.
      return Boolean(sourceId && pluginId && operationId);
    }
    case 'database': {
      const dbId = toNonEmptyString(nodeParam.dbId);
      return Boolean(sourceId && dbId);
    }
    case 'workflow':
    case 'flow': {
      const flowId = toNonEmptyString(nodeParam.flowId);
      return Boolean(sourceId && flowId);
    }
    case 'knowledge': {
      const boundIds = knowledgeBindingIds(nodeType, nodeParam);
      // Import cleaning removes unresolved bindings. Any later non-empty
      // binding is therefore an explicit user replacement; the server remains
      // responsible for visibility and effective Core-field validation.
      return boundIds.size > 0;
    }
    default:
      return false;
  }
};

const issueFromMarker = (
  node: UnknownRecord,
  marker: UnknownRecord,
  origin: ActiveImportDependencyIssue['origin'],
  dependencyType?: string
): ActiveImportDependencyIssue => {
  const data = asRecord(node.data);
  return {
    nodeId: toNonEmptyString(node.id) ?? '',
    nodeName: toNonEmptyString(data?.label) ?? toNonEmptyString(node.id) ?? '',
    nodeType:
      toNonEmptyString(node.nodeType) ?? toNonEmptyString(node.type) ?? '',
    dependencyType:
      normalizeCode(marker.dependencyType ?? dependencyType).toLowerCase() ||
      'unknown',
    status:
      normalizeCode(marker.status ?? marker.importDependencyStatus) ||
      'UNKNOWN',
    reason: toNonEmptyString(marker.reason ?? marker.importDependencyReason),
    sourcePluginId: toNonEmptyString(marker.sourcePluginId),
    sourceOperationId: toNonEmptyString(marker.sourceOperationId),
    sourceVersion: toNonEmptyString(marker.sourceVersion),
    candidatePluginIds: asStrings(marker.candidatePluginIds),
    origin,
  };
};

const collectNodes = (value: unknown): UnknownRecord[] => {
  const nodes: UnknownRecord[] = [];
  const seen = new Set<UnknownRecord>();

  const visit = (candidate: unknown, allowRootContainer = true): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(item => visit(item, false));
      return;
    }
    const record = asRecord(candidate);
    if (!record || seen.has(record)) return;
    seen.add(record);

    if (record.id != null && isRecord(record.data)) nodes.push(record);

    const nestedKeys = ['nodes', 'children', 'childNodes'];
    nestedKeys.forEach(key => visit(record[key], false));
    const data = asRecord(record.data);
    if (allowRootContainer || record.id != null) {
      nestedKeys.forEach(key => visit(data?.[key], false));
    }
  };

  visit(value);
  return nodes;
};

/**
 * Returns only import markers that still require user action on the canvas.
 * A complete replacement binding is delegated to the server's authoritative
 * visibility/version/contract check. Unknown marker shapes fail closed.
 */
export const getActiveImportDependencyIssues = (
  workflowOrNodes: unknown
): ActiveImportDependencyIssue[] => {
  const active: ActiveImportDependencyIssue[] = [];
  const activeKeys = new Set<string>();
  const addActive = (issue: ActiveImportDependencyIssue): void => {
    const key = [
      issue.nodeId,
      issue.dependencyType,
      issue.sourcePluginId ?? '',
      issue.sourceOperationId ?? '',
      issue.status,
    ].join('\u0000');
    if (activeKeys.has(key)) return;
    activeKeys.add(key);
    active.push(issue);
  };

  collectNodes(workflowOrNodes).forEach(node => {
    const data = asRecord(node.data);
    const nodeMeta = asRecord(data?.nodeMeta);
    const dependencies = Array.isArray(nodeMeta?.importDependencies)
      ? nodeMeta.importDependencies
      : [];

    dependencies.forEach(rawIssue => {
      const issue = asRecord(rawIssue) ?? { status: 'UNKNOWN' };
      const dependencyType = normalizeCode(issue.dependencyType).toLowerCase();
      // Resolved entries do not need source identity fields. Keep the
      // dependency kind strict so an unknown future protocol cannot bypass the
      // guard merely by calling itself resolved.
      if (
        KNOWN_DEPENDENCY_TYPES.has(dependencyType) &&
        isResolvedStatus(markerStatus(issue))
      ) {
        return;
      }
      const markerIsKnown = hasValidMarkerShape(node, issue, dependencyType);
      // Unknown statuses, dependency kinds and malformed entries fail closed.
      if (!markerIsKnown) {
        addActive(issueFromMarker(node, issue, 'nodeMeta'));
        return;
      }
      if (isStructurallyRebound(node, issue)) return;
      addActive(issueFromMarker(node, issue, 'nodeMeta'));
    });

    if (
      dependencies.length === 0 &&
      nodeMeta != null &&
      Object.prototype.hasOwnProperty.call(nodeMeta, 'importDependencyStatus')
    ) {
      const fallback = {
        dependencyType: inferDependencyType(node),
        status: nodeMeta.importDependencyStatus,
        reason: nodeMeta.importDependencyReason,
      };
      const fallbackKnown =
        KNOWN_DEPENDENCY_TYPES.has(fallback.dependencyType) &&
        isKnownStatus(fallback.status);
      if (
        !fallbackKnown ||
        (!isResolvedStatus(fallback.status) &&
          !isStructurallyRebound(node, fallback))
      ) {
        addActive(issueFromMarker(node, fallback, 'fallback'));
      }
    }

    const nodeParam = asRecord(data?.nodeParam) ?? {};
    const plugin = asRecord(nodeParam.plugin);
    asRecords(plugin?.toolsList).forEach(tool => {
      const markerKnown = isKnownStatus(tool.importDependencyStatus);
      if (
        !Object.prototype.hasOwnProperty.call(tool, 'importDependencyStatus') ||
        (markerKnown && isResolvedStatus(tool.importDependencyStatus)) ||
        (markerKnown && isAgentToolMarkerRebound(tool, nodeParam))
      ) {
        return;
      }
      addActive(issueFromMarker(node, tool, 'agentTool', 'plugin'));
    });
  });

  return active;
};

export const hasActiveImportDependencyIssues = (
  workflowOrNodes: unknown
): boolean => getActiveImportDependencyIssues(workflowOrNodes).length > 0;
