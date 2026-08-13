export interface WorkflowImportReportEntry {
  nodeId?: string | number;
  nodeName?: string;
  nodeType?: string;
  dependencyType?: string;
  status?: string;
  reasonCode?: string;
  reason?: string;
  mappingType?: string;
  sourcePluginId?: string;
  sourceName?: string;
  sourceOperationId?: string;
  sourceVersion?: string;
  sourceStableKey?: string;
  targetPluginId?: string;
  targetOperationId?: string;
  targetName?: string;
  targetVersion?: string;
  candidatePluginIds?: string[];
  [key: string]: unknown;
}

export interface WorkflowImportReport {
  version?: string | number;
  total?: number;
  totalCount?: number;
  resolved?: number;
  resolvedCount?: number;
  mapped?: number;
  mappedCount?: number;
  unresolved?: number;
  unresolvedCount?: number;
  ambiguous?: number;
  ambiguousCount?: number;
  entries?: WorkflowImportReportEntry[];
  [key: string]: unknown;
}

export interface WorkflowImportResponse {
  flowId?: string | number;
  id?: string | number;
  workflow?: WorkflowImportResponse;
  report?: WorkflowImportReport;
  importReport?: WorkflowImportReport;
  ext?: string | Record<string, unknown>;
  data?: unknown;
  [key: string]: unknown;
}

export interface NormalizedWorkflowImportResult {
  flowId: string;
  report?: WorkflowImportReport;
}

export type WorkflowImportEntryStatus =
  | 'resolved'
  | 'unresolved'
  | 'ambiguous'
  | 'unknown';

export interface WorkflowImportReportSummary {
  total: number;
  resolved: number;
  unresolved: number;
  ambiguous: number;
  hasProblem: boolean;
}

export type WorkflowImportDependencyKind =
  | 'plugin'
  | 'database'
  | 'workflow'
  | 'knowledge'
  | 'unknown';

export interface WorkflowImportDependencyPresentation {
  kind: WorkflowImportDependencyKind;
  resourceLabelKey:
    | 'importReportPluginId'
    | 'importReportDatabaseId'
    | 'importReportWorkflowId'
    | 'importReportKnowledgeId'
    | 'importReportResourceId';
  sourceResourceId?: string;
  targetResourceId?: string;
  showPluginDetails: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Business errors are already displayed by the shared Axios interceptor.
 * Transport/authentication errors use the local 100/101 codes without a
 * global toast, while native errors are created locally by the import flow.
 */
export const shouldShowWorkflowImportError = (value: unknown): boolean => {
  const code = isRecord(value) ? value.code : undefined;
  return (
    typeof code !== 'number' ||
    !Number.isFinite(code) ||
    code === 100 ||
    code === 101
  );
};

const unwrapPayload = (value: unknown): unknown => {
  let current = value;
  // Axios normally strips ApiResult, but tests, alternate clients, and older
  // adapters can leave one or more `{ code, data }` layers in place.
  for (let depth = 0; depth < 3 && isRecord(current); depth += 1) {
    if (!('code' in current) || !('data' in current)) break;
    current = current.data;
  }
  return current;
};

const parseRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const firstNonEmpty = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0)
      return String(value);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const DEPENDENCY_PRESENTATION = {
  plugin: 'importReportPluginId',
  database: 'importReportDatabaseId',
  workflow: 'importReportWorkflowId',
  knowledge: 'importReportKnowledgeId',
  unknown: 'importReportResourceId',
} as const;

/**
 * The current backend protocol reuses the plugin ID fields for every resource
 * kind. Keep that wire-format detail out of the UI so non-plugin dependencies
 * are labelled accurately and never expose plugin-only metadata.
 */
export const getWorkflowImportDependencyPresentation = (
  entry: WorkflowImportReportEntry
): WorkflowImportDependencyPresentation => {
  const rawKind = String(entry.dependencyType ?? '')
    .trim()
    .toLowerCase();
  const normalizedKind = rawKind === 'flow' ? 'workflow' : rawKind;
  const kind: WorkflowImportDependencyKind =
    Object.prototype.hasOwnProperty.call(
      DEPENDENCY_PRESENTATION,
      normalizedKind
    )
      ? (normalizedKind as Exclude<WorkflowImportDependencyKind, 'unknown'>)
      : 'unknown';

  return {
    kind,
    resourceLabelKey: DEPENDENCY_PRESENTATION[kind],
    sourceResourceId: firstNonEmpty(entry.sourcePluginId),
    targetResourceId: firstNonEmpty(entry.targetPluginId),
    showPluginDetails: kind === 'plugin',
  };
};

const normalizeStatus = (status: unknown): string =>
  String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');

export const getWorkflowImportEntryStatus = (
  entry: WorkflowImportReportEntry
): WorkflowImportEntryStatus => {
  const status = normalizeStatus(entry.status);
  if (['AMBIGUOUS', 'MULTIPLE_MATCHES'].includes(status)) return 'ambiguous';
  if (
    [
      'UNRESOLVED',
      'UNRESOLVED_DEPENDENCY',
      'MISSING',
      'NO_MATCH',
      'FORBIDDEN',
      'PERMISSION_DENIED',
      'INCOMPATIBLE',
      'FAILED',
      'NOT_FOUND',
    ].includes(status)
  ) {
    return 'unresolved';
  }
  if (
    [
      'MAPPED',
      'RESOLVED',
      'SUCCESS',
      'OK',
      'AUTO_MAPPED',
      'AUTO_RESOLVED',
    ].includes(status)
  ) {
    return 'resolved';
  }
  return 'unknown';
};

const toCount = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;

const firstCount = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const count = toCount(value);
    if (count !== undefined) return count;
  }
  return undefined;
};

/**
 * Build mutually exclusive report counters across current and legacy payloads.
 * Detailed entries are authoritative when present. For aggregate-only payloads,
 * an unexplained remainder is treated as unresolved so the UI never reports a
 * successful migration without evidence.
 */
export const summarizeWorkflowImportReport = (
  report?: WorkflowImportReport
): WorkflowImportReportSummary => {
  const entries = Array.isArray(report?.entries) ? report.entries : [];
  if (entries.length > 0) {
    const statuses = entries.map(getWorkflowImportEntryStatus);
    const resolved = statuses.filter(status => status === 'resolved').length;
    const ambiguous = statuses.filter(status => status === 'ambiguous').length;
    const unresolved = statuses.length - resolved - ambiguous;
    return {
      total: entries.length,
      resolved,
      unresolved,
      ambiguous,
      hasProblem: unresolved > 0 || ambiguous > 0,
    };
  }

  const resolved =
    firstCount(
      report?.resolved,
      report?.resolvedCount,
      report?.mapped,
      report?.mappedCount
    ) ?? 0;
  const ambiguous = firstCount(report?.ambiguous, report?.ambiguousCount) ?? 0;
  let unresolved = firstCount(report?.unresolved, report?.unresolvedCount) ?? 0;
  const declaredTotal =
    firstCount(report?.total, report?.totalCount) ??
    resolved + ambiguous + unresolved;
  const total = Math.max(declaredTotal, resolved + ambiguous + unresolved);
  unresolved += Math.max(0, total - resolved - ambiguous - unresolved);

  return {
    total,
    resolved,
    unresolved,
    ambiguous,
    hasProblem: unresolved > 0 || ambiguous > 0,
  };
};

const toReport = (value: unknown): WorkflowImportReport | undefined => {
  const report = parseRecord(value);
  if (!report) return undefined;
  const rawEntries =
    report.entries ??
    report.items ??
    report.nodes ??
    report.details ??
    report.dependencies;
  return {
    ...report,
    // Invalid entry containers are normalized to an empty list.  This keeps
    // the report screen usable if a mixed-version backend omits or changes the
    // optional details while still returning aggregate counters.
    entries: Array.isArray(rawEntries)
      ? (rawEntries.filter(isRecord) as WorkflowImportReportEntry[])
      : [],
  };
};

/**
 * Normalize all known import response shapes.  This helper intentionally does
 * not require a report: a response from an older backend still navigates using
 * its `flowId` exactly as before.
 */
export function normalizeWorkflowImportResult(
  value: unknown
): NormalizedWorkflowImportResult | undefined {
  const payload = unwrapPayload(value);
  if (!isRecord(payload)) return undefined;

  const nestedData = isRecord(payload.data) ? payload.data : undefined;
  const nestedWorkflow =
    nestedData && isRecord(nestedData.workflow)
      ? nestedData.workflow
      : undefined;
  const workflow =
    (isRecord(payload.workflow) ? payload.workflow : undefined) ??
    nestedWorkflow ??
    nestedData ??
    payload;
  const extension =
    parseRecord(workflow.ext) ??
    parseRecord(payload.ext) ??
    parseRecord(nestedData?.ext);
  const report =
    toReport(payload.report) ??
    toReport(payload.importReport) ??
    toReport(workflow.report) ??
    toReport(workflow.importReport) ??
    toReport(extension?.importReport) ??
    toReport(extension?.report) ??
    toReport(nestedData?.report) ??
    toReport(nestedData?.importReport) ??
    toReport(nestedWorkflow?.report) ??
    toReport(nestedWorkflow?.importReport);
  const flowId = firstNonEmpty(
    workflow.flowId,
    workflow.id,
    nestedWorkflow?.flowId,
    nestedWorkflow?.id,
    nestedData?.flowId,
    nestedData?.id,
    payload.flowId,
    payload.id
  );

  return flowId ? { flowId, report } : undefined;
}
