import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getWorkflowImportDependencyPresentation,
  getWorkflowImportEntryStatus,
  normalizeWorkflowImportResult,
  shouldShowWorkflowImportError,
  summarizeWorkflowImportReport,
} from '../src/services/workflow-import.ts';

test('maps dependency kinds to accurate resource labels and plugin details', () => {
  const cases = [
    ['plugin', 'importReportPluginId', true],
    ['database', 'importReportDatabaseId', false],
    ['workflow', 'importReportWorkflowId', false],
    ['flow', 'importReportWorkflowId', false],
    ['knowledge', 'importReportKnowledgeId', false],
    ['future-kind', 'importReportResourceId', false],
  ];

  cases.forEach(([dependencyType, resourceLabelKey, showPluginDetails]) => {
    assert.deepEqual(
      getWorkflowImportDependencyPresentation({
        dependencyType,
        sourcePluginId: 'source-id',
        targetPluginId: 'target-id',
        candidatePluginIds: ['candidate'],
      }),
      {
        kind:
          dependencyType === 'flow'
            ? 'workflow'
            : dependencyType === 'future-kind'
              ? 'unknown'
              : dependencyType,
        resourceLabelKey,
        sourceResourceId: 'source-id',
        targetResourceId: 'target-id',
        showPluginDetails,
      }
    );
  });
});

test('keeps an absent target resource ID absent for source-only reports', () => {
  assert.deepEqual(
    getWorkflowImportDependencyPresentation({
      dependencyType: 'database',
      sourcePluginId: 'database-id',
    }),
    {
      kind: 'database',
      resourceLabelKey: 'importReportDatabaseId',
      sourceResourceId: 'database-id',
      targetResourceId: undefined,
      showPluginDetails: false,
    }
  );
});

test('shows import errors only when the shared interceptor has not done so', () => {
  assert.equal(
    shouldShowWorkflowImportError({ code: 8125, message: 'DSL invalid' }),
    false
  );
  assert.equal(
    shouldShowWorkflowImportError({ code: 100, message: 'Network error' }),
    true
  );
  assert.equal(
    shouldShowWorkflowImportError(new Error('invalid response')),
    true
  );
  assert.equal(shouldShowWorkflowImportError(null), true);
});

test('normalizes the legacy workflow response without requiring a report', () => {
  assert.deepEqual(normalizeWorkflowImportResult({ flowId: 'flow-legacy' }), {
    flowId: 'flow-legacy',
    report: undefined,
  });
});

test('normalizes the current WorkflowImportResponse shape', () => {
  const result = normalizeWorkflowImportResult({
    id: 42,
    flowId: 'flow-current',
    importReport: {
      total: 2,
      resolved: 1,
      unresolved: 1,
      entries: [
        { nodeId: 'plugin::1', status: 'MAPPED' },
        { nodeId: 'plugin::2', status: 'MISSING' },
      ],
    },
  });

  assert.equal(result?.flowId, 'flow-current');
  assert.equal(result?.report?.entries?.length, 2);
});

test('preserves structured dependency protocol details for the import report', () => {
  const result = normalizeWorkflowImportResult({
    flowId: 'flow-protocol-details',
    report: {
      entries: [
        {
          nodeId: 'plugin::1',
          status: 'MAPPED',
          mappingType: 'COMPATIBLE_NAME',
          reasonCode: 'UNIQUE_COMPATIBLE_NAME_MATCHED',
          sourcePluginId: 'source-plugin',
          targetPluginId: 'target-plugin',
          sourceOperationId: 'source-operation',
          targetOperationId: 'target-operation',
          sourceVersion: 'V1.0',
          targetVersion: 'V2.0',
          candidatePluginIds: ['candidate-a', 'candidate-b'],
        },
      ],
    },
  });

  assert.deepEqual(result?.report?.entries?.[0], {
    nodeId: 'plugin::1',
    status: 'MAPPED',
    mappingType: 'COMPATIBLE_NAME',
    reasonCode: 'UNIQUE_COMPATIBLE_NAME_MATCHED',
    sourcePluginId: 'source-plugin',
    targetPluginId: 'target-plugin',
    sourceOperationId: 'source-operation',
    targetOperationId: 'target-operation',
    sourceVersion: 'V1.0',
    targetVersion: 'V2.0',
    candidatePluginIds: ['candidate-a', 'candidate-b'],
  });
});

test('prefers a nested workflow over wrapper metadata', () => {
  const result = normalizeWorkflowImportResult({
    id: 'request-id',
    data: {
      workflow: { flowId: 'flow-nested' },
      report: { total: 0, entries: [] },
    },
  });

  assert.equal(result?.flowId, 'flow-nested');
  assert.equal(result?.report?.total, 0);
});

test('unwraps ApiResult and reads a report from extension JSON', () => {
  const result = normalizeWorkflowImportResult({
    code: 0,
    data: {
      flowId: 'flow-wrapper',
      ext: JSON.stringify({
        importReport: {
          total: 1,
          entries: [{ nodeId: 'database::1', status: 'MISSING' }],
        },
      }),
    },
  });

  assert.equal(result?.flowId, 'flow-wrapper');
  assert.equal(result?.report?.entries?.[0]?.nodeId, 'database::1');
});

test('keeps aggregate report data when entries are absent or invalid', () => {
  const result = normalizeWorkflowImportResult({
    flowId: 'flow-aggregate',
    report: { total: 3, unresolved: 3, entries: 'not-an-array' },
  });

  assert.equal(result?.report?.total, 3);
  assert.deepEqual(result?.report?.entries, []);
});

test('rejects responses without a usable workflow identifier', () => {
  assert.equal(normalizeWorkflowImportResult({ importReport: {} }), undefined);
  assert.equal(normalizeWorkflowImportResult({ flowId: '   ' }), undefined);
  assert.equal(normalizeWorkflowImportResult(null), undefined);
});

test('uses detailed entries as the authoritative mutually exclusive counts', () => {
  const summary = summarizeWorkflowImportReport({
    total: 99,
    resolved: 88,
    unresolved: 77,
    ambiguous: 66,
    entries: [
      { status: 'MAPPED' },
      { status: 'AMBIGUOUS' },
      { status: 'INCOMPATIBLE' },
      { status: 'future-status' },
    ],
  });

  assert.deepEqual(summary, {
    total: 4,
    resolved: 1,
    unresolved: 2,
    ambiguous: 1,
    hasProblem: true,
  });
});

test('treats an unexplained aggregate remainder as unresolved', () => {
  assert.deepEqual(summarizeWorkflowImportReport({ total: 3, resolved: 1 }), {
    total: 3,
    resolved: 1,
    unresolved: 2,
    ambiguous: 0,
    hasProblem: true,
  });
});

test('reports success only when every dependency is resolved', () => {
  assert.deepEqual(
    summarizeWorkflowImportReport({
      entries: [{ status: 'MAPPED' }, { status: 'AUTO_RESOLVED' }],
    }),
    {
      total: 2,
      resolved: 2,
      unresolved: 0,
      ambiguous: 0,
      hasProblem: false,
    }
  );
  assert.equal(getWorkflowImportEntryStatus({ status: undefined }), 'unknown');
});
