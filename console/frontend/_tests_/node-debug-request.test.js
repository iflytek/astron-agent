import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import {
  createWorkflowIdentity,
  createNodeDebugRequestCoordinator,
  executeNodeDebugRequest,
  isNodeDebugCancellation,
  mergeNodeDebugRequest,
  mergeNodeDebugState,
} from '../src/components/workflow/nodes/components/node-operation/node-debug-request.ts';
import { createWorkflowAsyncGuard } from '../src/components/workflow/utils/workflow-async-guard.ts';

test('workflow async guards supersede another route without stale cleanup', () => {
  const guard = createWorkflowAsyncGuard();
  const first = guard.start('workflow-a');

  assert.ok(first);
  assert.equal(guard.start('workflow-a'), undefined);
  const second = guard.start('workflow-b');
  assert.ok(second);
  assert.equal(guard.isCurrent(first, 'workflow-a'), false);
  assert.equal(guard.finish(first), false);
  assert.equal(guard.isCurrent(second, 'workflow-b'), true);
  assert.equal(guard.isCurrent(second, 'workflow-c'), false);
  assert.equal(guard.finish(second), true);
});

test('workflow async guards keep an invalidated ABA request stale forever', () => {
  const guard = createWorkflowAsyncGuard();
  const first = guard.start('workflow-a');
  assert.ok(first);

  guard.invalidate();

  assert.equal(guard.isCurrent(first, 'workflow-a'), false);
  assert.equal(guard.finish(first), false);
  const next = guard.start('workflow-a');
  assert.ok(next);
  assert.notEqual(next.requestId, first.requestId);
  assert.equal(guard.isCurrent(next, 'workflow-a'), true);
});

test('starting a node debug request aborts and invalidates its predecessor', () => {
  const coordinator = createNodeDebugRequestCoordinator();
  const first = coordinator.start();
  const second = coordinator.start();

  assert.equal(first.controller.signal.aborted, true);
  assert.equal(coordinator.isLatest(first.requestId), false);
  assert.equal(coordinator.isLatest(second.requestId), true);
  assert.equal(coordinator.finish(first.requestId), false);
  assert.equal(coordinator.isLatest(second.requestId), true);
  assert.equal(coordinator.finish(second.requestId), true);
  assert.equal(coordinator.isLatest(second.requestId), false);
});

test('flushes the latest draft before setting running state and sending the request', async () => {
  const events = [];
  let releaseFlush;
  const flushBarrier = new Promise(resolve => {
    releaseFlush = resolve;
  });

  const execution = executeNodeDebugRequest({
    coordinator: createNodeDebugRequestCoordinator(),
    workflowIdentity: 'workflow-a',
    isWorkflowCurrent: identity => identity === 'workflow-a',
    flushCurrentFlow: async () => {
      events.push('flush:start');
      await flushBarrier;
      events.push('flush:end');
    },
    request: async () => {
      events.push('request');
      return 'ok';
    },
    onRunning: () => events.push('running'),
    onSuccess: () => events.push('success'),
    onFailure: () => events.push('failure'),
    onFlushFailure: () => events.push('flush:failure'),
    onSettled: () => events.push('settled'),
  });

  assert.deepEqual(events, ['flush:start']);
  releaseFlush();
  await execution.completion;
  assert.deepEqual(events, [
    'flush:start',
    'flush:end',
    'running',
    'request',
    'success',
    'settled',
  ]);
});

test('does not set running state or send a request when draft flush fails', async () => {
  const coordinator = createNodeDebugRequestCoordinator();
  const saveError = new Error('save failed');
  const events = [];
  let requestCount = 0;

  const execution = executeNodeDebugRequest({
    coordinator,
    workflowIdentity: 'workflow-a',
    isWorkflowCurrent: () => true,
    flushCurrentFlow: async () => {
      throw saveError;
    },
    request: async () => {
      requestCount += 1;
      return 'unexpected';
    },
    onRunning: () => events.push('running'),
    onSuccess: () => events.push('success'),
    onFailure: () => events.push('failure'),
    onFlushFailure: error => events.push(['flush:failure', error]),
    onSettled: () => events.push('settled'),
  });

  await execution.completion;
  assert.equal(requestCount, 0);
  assert.deepEqual(events, [['flush:failure', saveError], 'settled']);
  assert.equal(coordinator.isLatest(execution.request.requestId), false);
});

test('merges a response into the latest node without reverting edits made in flight', () => {
  const latestNode = {
    id: 'same-node-id',
    position: { x: 80, y: 120 },
    data: {
      label: 'edited while debugging',
      inputs: [{ id: 'input-1', value: 'new value' }],
      status: 'running',
      debuggerResult: { output: 'old output' },
    },
  };

  const merged = mergeNodeDebugState(latestNode, {
    status: 'success',
    debuggerResult: { output: 'new output' },
  });

  assert.notEqual(merged, latestNode);
  assert.notEqual(merged.data, latestNode.data);
  assert.equal(merged.data.label, 'edited while debugging');
  assert.deepEqual(merged.data.inputs, [{ id: 'input-1', value: 'new value' }]);
  assert.equal(merged.data.status, 'success');
  assert.deepEqual(merged.data.debuggerResult, { output: 'new output' });
  assert.equal(latestNode.data.status, 'running');
});

test('builds the request from the latest node with transient debugger inputs', () => {
  const latestNode = {
    id: 'node-1',
    position: { x: 90, y: 120 },
    data: {
      label: 'latest label',
      inputs: [
        {
          id: 'input-1',
          name: 'latest input name',
          schema: {
            type: 'string',
            value: { type: 'ref', content: { nodeId: 'upstream' } },
          },
        },
        {
          id: 'input-2',
          schema: {
            type: 'string',
            value: { type: 'literal', content: 'edited' },
          },
        },
        {
          id: 'input-3',
          schema: {
            type: 'string',
            value: { type: 'literal', content: 'added' },
          },
        },
      ],
    },
  };
  const originalNode = {
    id: 'node-1',
    position: { x: 10, y: 20 },
    data: {
      label: 'original label',
      inputs: [
        {
          id: 'input-1',
          schema: {
            type: 'string',
            value: { type: 'ref', content: { nodeId: 'upstream' } },
          },
        },
        {
          id: 'input-2',
          schema: {
            type: 'string',
            value: { type: 'literal', content: 'old' },
          },
        },
      ],
    },
  };
  const requestedNode = {
    id: 'node-1',
    position: { x: 10, y: 20 },
    data: {
      label: 'stale label',
      inputs: [
        {
          id: 'input-1',
          schema: { value: { type: 'literal', content: 'debug value' } },
        },
        {
          id: 'input-2',
          schema: {
            type: 'string',
            value: { type: 'literal', content: 'old' },
          },
        },
      ],
    },
  };

  const merged = mergeNodeDebugRequest(latestNode, originalNode, requestedNode);

  assert.equal(merged.data.label, 'latest label');
  assert.deepEqual(merged.position, { x: 90, y: 120 });
  assert.deepEqual(merged.data.inputs, [
    {
      id: 'input-1',
      name: 'latest input name',
      schema: {
        type: 'string',
        value: { type: 'literal', content: 'debug value' },
      },
    },
    {
      id: 'input-2',
      schema: { type: 'string', value: { type: 'literal', content: 'edited' } },
    },
    {
      id: 'input-3',
      schema: { type: 'string', value: { type: 'literal', content: 'added' } },
    },
  ]);
});

test('workflow identity change suppresses a stale same-node response before cleanup runs', async () => {
  const coordinator = createNodeDebugRequestCoordinator();
  let currentWorkflowIdentity = createWorkflowIdentity({
    id: 'workflow-a',
    flowId: 'flow-a',
    routeIdentity: '/workflow/workflow-a',
  });
  let resolveRequest;
  const requestResult = new Promise(resolve => {
    resolveRequest = resolve;
  });
  const successes = [];

  const execution = executeNodeDebugRequest({
    coordinator,
    workflowIdentity: currentWorkflowIdentity,
    isWorkflowCurrent: identity => identity === currentWorkflowIdentity,
    flushCurrentFlow: async () => undefined,
    request: async () => requestResult,
    onSuccess: result => successes.push(result),
    onFailure: () => undefined,
    onFlushFailure: () => undefined,
  });

  await Promise.resolve();
  currentWorkflowIdentity = createWorkflowIdentity({
    id: 'workflow-b',
    flowId: 'flow-b',
    routeIdentity: '/workflow/workflow-b',
  });
  resolveRequest({ nodeId: 'same-node-id', output: 'stale-a' });
  await execution.completion;

  assert.deepEqual(successes, []);
});

test('unmount invalidation aborts ownership and suppresses a late response', async () => {
  const coordinator = createNodeDebugRequestCoordinator();
  let resolveRequest;
  const requestResult = new Promise(resolve => {
    resolveRequest = resolve;
  });
  const successes = [];

  const execution = executeNodeDebugRequest({
    coordinator,
    workflowIdentity: 'workflow-a',
    isWorkflowCurrent: () => true,
    flushCurrentFlow: async () => undefined,
    request: async () => requestResult,
    onSuccess: result => successes.push(result),
    onFailure: () => undefined,
    onFlushFailure: () => undefined,
  });

  await Promise.resolve();
  assert.equal(coordinator.invalidate(execution.request.requestId), true);
  assert.equal(execution.request.controller.signal.aborted, true);
  resolveRequest({ nodeId: 'same-node-id', output: 'stale-a' });
  await execution.completion;

  assert.deepEqual(successes, []);
});

test('a repeated click cancels the active request and only applies the latest result', async () => {
  const coordinator = createNodeDebugRequestCoordinator();
  const successes = [];
  let resolveFirst;
  const firstResult = new Promise(resolve => {
    resolveFirst = resolve;
  });

  const createExecution = request =>
    executeNodeDebugRequest({
      coordinator,
      workflowIdentity: 'workflow-a',
      isWorkflowCurrent: () => true,
      flushCurrentFlow: async () => undefined,
      request,
      onSuccess: result => successes.push(result),
      onFailure: () => undefined,
      onFlushFailure: () => undefined,
    });

  const first = createExecution(async () => firstResult);
  await Promise.resolve();
  const second = createExecution(async () => 'second');

  assert.equal(first.request.controller.signal.aborted, true);
  resolveFirst('first');
  await Promise.all([first.completion, second.completion]);
  assert.deepEqual(successes, ['second']);
});

test('starting another node cancels the old node without settling the new global state', async () => {
  const coordinator = createNodeDebugRequestCoordinator();
  const states = { a: [], b: [] };
  const globalSettled = [];
  let resolveFirst;
  const firstResult = new Promise(resolve => {
    resolveFirst = resolve;
  });

  const first = executeNodeDebugRequest({
    coordinator,
    workflowIdentity: 'workflow-a',
    isWorkflowCurrent: () => true,
    flushCurrentFlow: async () => undefined,
    request: async () => firstResult,
    onRunning: () => states.a.push('running'),
    onSuccess: () => states.a.push('success'),
    onFailure: () => states.a.push('failed'),
    onFlushFailure: () => states.a.push('flush-failed'),
    onSuperseded: () => states.a.push('cancel'),
    onSettled: () => globalSettled.push('a'),
  });
  await Promise.resolve();

  const second = executeNodeDebugRequest({
    coordinator,
    workflowIdentity: 'workflow-a',
    isWorkflowCurrent: () => true,
    flushCurrentFlow: async () => undefined,
    request: async () => 'second',
    onRunning: () => states.b.push('running'),
    onSuccess: () => states.b.push('success'),
    onFailure: () => states.b.push('failed'),
    onFlushFailure: () => states.b.push('flush-failed'),
    onSuperseded: () => states.b.push('cancel'),
    onSettled: () => globalSettled.push('b'),
  });

  resolveFirst('first');
  await Promise.all([first.completion, second.completion]);

  assert.deepEqual(states.a, ['running', 'cancel']);
  assert.deepEqual(states.b, ['running', 'success']);
  assert.deepEqual(globalSettled, ['b']);
});

test('superseding after a workflow switch never writes cancellation into the new workflow', async () => {
  const coordinator = createNodeDebugRequestCoordinator();
  let currentWorkflowIdentity = 'workflow-a';
  const states = [];
  let resolveFirst;
  const firstResult = new Promise(resolve => {
    resolveFirst = resolve;
  });

  const first = executeNodeDebugRequest({
    coordinator,
    workflowIdentity: 'workflow-a',
    isWorkflowCurrent: identity => identity === currentWorkflowIdentity,
    flushCurrentFlow: async () => undefined,
    request: async () => firstResult,
    onRunning: () => states.push('a:running'),
    onSuccess: () => states.push('a:success'),
    onFailure: () => states.push('a:failed'),
    onFlushFailure: () => states.push('a:flush-failed'),
    onSuperseded: () => states.push('a:stale-cancel'),
  });
  await Promise.resolve();
  currentWorkflowIdentity = 'workflow-b';

  const second = executeNodeDebugRequest({
    coordinator,
    workflowIdentity: 'workflow-b',
    isWorkflowCurrent: identity => identity === currentWorkflowIdentity,
    flushCurrentFlow: async () => undefined,
    request: async () => 'second',
    onRunning: () => states.push('b:running'),
    onSuccess: () => states.push('b:success'),
    onFailure: () => states.push('b:failed'),
    onFlushFailure: () => states.push('b:flush-failed'),
    onSuperseded: () => states.push('b:cancel'),
  });

  resolveFirst('first');
  await Promise.all([first.completion, second.completion]);

  assert.deepEqual(states, ['a:running', 'b:running', 'b:success']);
});

test('recognizes AbortSignal and Axios cancellation without hiding other errors', () => {
  const aborted = new AbortController();
  aborted.abort();
  const active = new AbortController();

  assert.equal(
    isNodeDebugCancellation(new Error('late'), aborted.signal),
    true
  );
  assert.equal(
    isNodeDebugCancellation(
      new axios.CanceledError('cancelled'),
      active.signal
    ),
    true
  );
  assert.equal(
    isNodeDebugCancellation(new Error('failed'), active.signal),
    false
  );
});
