import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getActiveImportDependencyIssues,
  hasActiveImportDependencyIssues,
} from '../src/components/workflow/utils/workflow-import-dependencies.ts';

const node = (id, nodeParam, marker, extraData = {}) => ({
  id,
  nodeType: id.split('::')[0],
  data: {
    label: id,
    nodeParam,
    nodeMeta: marker,
    ...extraData,
  },
});

const marker = (dependencyType, status = 'MISSING', extra = {}) => ({
  importDependencyStatus: status,
  importDependencies: [{ dependencyType, status, ...extra }],
});

test('finds unresolved plugin markers in flat and nested workflow nodes', () => {
  const direct = node('plugin::direct', {}, marker('plugin'));
  const iteratorChild = {
    ...node('plugin::child', {}, marker('plugin')),
    parentId: 'iteration::1',
  };
  iteratorChild.data.parentId = 'iteration::1';

  const issues = getActiveImportDependencyIssues({
    nodes: [direct, iteratorChild],
  });
  assert.deepEqual(
    issues.map(issue => issue.nodeId),
    ['plugin::direct', 'plugin::child']
  );
});

test('fails closed for fallback and unknown marker status', () => {
  const fallback = node(
    'database::1',
    {},
    {
      importDependencyStatus: 'FUTURE_STATE',
      importDependencyReason: 'new protocol state',
    }
  );
  const issue = getActiveImportDependencyIssues([fallback])[0];
  assert.equal(issue.status, 'FUTURE_STATE');
  assert.equal(issue.origin, 'fallback');
});

test('fails closed when a resolved fallback belongs to an unknown node kind', () => {
  const unknown = node(
    'future-node::1',
    {},
    {
      importDependencyStatus: 'RESOLVED',
    }
  );
  const issue = getActiveImportDependencyIssues([unknown])[0];

  assert.equal(issue.status, 'RESOLVED');
  assert.equal(issue.dependencyType, 'future_node');
  assert.equal(issue.origin, 'fallback');
});

test('fails closed for malformed markers and unknown dependency kinds', () => {
  const malformed = node(
    'plugin::malformed',
    {},
    {
      importDependencyStatus: 'MISSING',
      importDependencies: [
        null,
        { dependencyType: 'plugin', status: 'MISSING' },
      ],
    }
  );
  const futureKind = node(
    'plugin::future',
    { pluginId: 'bound', operationId: 'operation' },
    marker('future-resource', 'RESOLVED', { sourcePluginId: 'source' })
  );

  const issues = getActiveImportDependencyIssues([malformed, futureKind]);
  assert.equal(issues.length, 3);
  assert.ok(issues.every(issue => issue.status !== 'MAPPED'));
  assert.ok(issues.some(issue => issue.dependencyType === 'unknown'));
  assert.ok(issues.some(issue => issue.dependencyType === 'future_resource'));
});

test('resolved protocol states remain eligible', () => {
  const mapped = node('plugin::1', {}, marker('plugin', 'MAPPED'));
  const resolved = node('flow::1', {}, marker('workflow', 'RESOLVED'));
  assert.equal(hasActiveImportDependencyIssues([mapped, resolved]), false);
});

test('delegates structurally rebound direct resources to the server guard', () => {
  const rebound = [
    node(
      'plugin::1',
      { pluginId: 'target', operationId: 'operation' },
      marker('plugin', 'MISSING', { sourcePluginId: 'source' })
    ),
    node(
      'database::1',
      { dbId: '7', tableName: 'records' },
      marker('database', 'MISSING', { sourcePluginId: 'source-database' })
    ),
    node(
      'flow::1',
      { flowId: 'target-flow' },
      marker('workflow', 'MISSING', { sourcePluginId: 'source-flow' })
    ),
    node(
      'knowledge-base::1',
      { repoId: ['source-repo'] },
      marker('knowledge', 'MISSING', { sourcePluginId: 'source-repo' })
    ),
  ];
  assert.equal(hasActiveImportDependencyIssues(rebound), false);
});

test('delegates restored same-ID direct resources to the server guard', () => {
  const restored = [
    node(
      'plugin::same',
      { pluginId: 'plugin-id', operationId: 'operation-id' },
      marker('plugin', 'MISSING', {
        sourcePluginId: 'plugin-id',
        sourceOperationId: 'operation-id',
      })
    ),
    node(
      'database::same',
      { dbId: '42', tableName: 'records' },
      marker('database', 'MISSING', { sourcePluginId: '42' })
    ),
    node(
      'flow::same',
      { flowId: 'flow-id' },
      marker('workflow', 'MISSING', { sourcePluginId: 'flow-id' })
    ),
  ];

  assert.equal(hasActiveImportDependencyIssues(restored), false);
});

test('requires a complete direct binding before delegating to the server', () => {
  const incomplete = [
    node(
      'plugin::incomplete',
      { pluginId: 'target' },
      marker('plugin', 'MISSING', { sourcePluginId: 'source' })
    ),
    node(
      'database::incomplete',
      {},
      marker('database', 'MISSING', { sourcePluginId: 'source' })
    ),
    node(
      'flow::incomplete',
      {},
      marker('workflow', 'MISSING', { sourcePluginId: 'source' })
    ),
  ];

  assert.deepEqual(
    getActiveImportDependencyIssues(incomplete).map(issue => issue.nodeId),
    ['plugin::incomplete', 'database::incomplete', 'flow::incomplete']
  );
});

test('delegates an explicit knowledge replacement to the server guard', () => {
  const replacement = node(
    'knowledge-base::replacement',
    { repoId: ['different-repo'] },
    marker('knowledge', 'MISSING', { sourcePluginId: 'missing-repo' })
  );
  const empty = node(
    'knowledge-base::empty',
    { repoId: [] },
    marker('knowledge', 'MISSING', { sourcePluginId: 'missing-repo' })
  );

  assert.equal(hasActiveImportDependencyIssues([replacement]), false);
  assert.equal(hasActiveImportDependencyIssues([empty]), true);
});

test('knowledge-base marker repair follows Core repos precedence', () => {
  const activeRepos = node(
    'knowledge-base::new-format',
    {
      repos: [{ repoId: 'target-repo' }],
      repoId: ['stale-source-repo'],
    },
    marker('knowledge', 'MISSING', { sourcePluginId: 'stale-source-repo' })
  );
  const malformedRepos = node(
    'knowledge-base::malformed-new-format',
    {
      repos: [{ name: 'missing-id' }],
      repoId: ['stale-source-repo'],
    },
    marker('knowledge', 'MISSING', { sourcePluginId: 'stale-source-repo' })
  );

  assert.equal(hasActiveImportDependencyIssues([activeRepos]), false);
  assert.equal(hasActiveImportDependencyIssues([malformedRepos]), true);
});

test('recognizes expert knowledge repos bindings when repairing import markers', () => {
  const replacement = node(
    'knowledge-expert-base::replacement',
    { repos: [{ repoId: 'different-repo' }] },
    marker('knowledge', 'MISSING', { sourcePluginId: 'missing-repo' })
  );
  const malformed = node(
    'knowledge-expert-base::malformed',
    { repos: [{ name: 'missing-id' }] },
    marker('knowledge', 'MISSING', { sourcePluginId: 'missing-repo' })
  );

  assert.equal(hasActiveImportDependencyIssues([replacement]), false);
  assert.equal(hasActiveImportDependencyIssues([malformed]), true);
});

test('keeps an aggregate agent knowledge marker without a source ID active', () => {
  const agent = node(
    'agent::knowledge',
    {
      plugin: {
        knowledge: [],
      },
    },
    marker('knowledge')
  );

  assert.equal(hasActiveImportDependencyIssues([agent]), true);
});

test('delegates an aggregate agent knowledge replacement to the server guard', () => {
  const agent = node(
    'agent::knowledge-replacement',
    {
      plugin: {
        knowledge: [{ match: { repoIds: ['target-repo'] } }],
      },
    },
    marker('knowledge')
  );

  assert.equal(hasActiveImportDependencyIssues([agent]), false);
});

test('keeps agent display marker active without a runtime tool binding', () => {
  const agent = node(
    'agent::1',
    {
      plugin: {
        tools: [],
        toolsList: [
          {
            type: 'tool',
            toolId: 'source',
            sourcePluginId: 'source',
            importDependencyStatus: 'AMBIGUOUS',
          },
        ],
      },
    },
    marker('plugin', 'AMBIGUOUS', { sourcePluginId: 'source' })
  );
  const issues = getActiveImportDependencyIssues([agent]);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].origin, 'nodeMeta');
});

test('delegates an explicit agent replacement to the server guard', () => {
  const agent = node(
    'agent::1',
    {
      plugin: {
        tools: [{ tool_id: 'target', version: 'V2.0' }],
        toolsList: [
          {
            type: 'tool',
            toolId: 'source',
            sourcePluginId: 'source',
            name: 'Portable Tool',
            importDependencyStatus: 'MISSING',
          },
          {
            type: 'tool',
            toolId: 'target',
            name: 'Completely Different Tool',
          },
        ],
      },
    },
    marker('plugin', 'MISSING', {
      sourcePluginId: 'source',
      sourceName: 'Portable Tool',
    })
  );
  assert.equal(hasActiveImportDependencyIssues([agent]), false);
});

test('deduplicates node metadata and agent display markers for one issue', () => {
  const agent = node(
    'agent::duplicate',
    {
      plugin: {
        tools: [],
        toolsList: [
          {
            type: 'tool',
            toolId: 'source',
            sourcePluginId: 'source',
            sourceOperationId: 'operation',
            importDependencyStatus: 'MISSING',
          },
        ],
      },
    },
    marker('plugin', 'MISSING', {
      sourcePluginId: 'source',
      sourceOperationId: 'operation',
    })
  );

  const issues = getActiveImportDependencyIssues([agent]);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].origin, 'nodeMeta');
});

test('detects agent tool marker even when nodeMeta is absent', () => {
  const agent = node(
    'agent::1',
    {
      plugin: {
        tools: [],
        toolsList: [
          {
            type: 'tool',
            toolId: 'missing',
            importDependencyStatus: 'MISSING',
            importDependencyReason: 'not visible',
          },
        ],
      },
    },
    {}
  );
  assert.equal(getActiveImportDependencyIssues([agent])[0].origin, 'agentTool');
});
