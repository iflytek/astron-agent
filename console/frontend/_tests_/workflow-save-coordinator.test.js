import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSaveCoordinator,
  shouldPersistWorkflowDraft,
} from '../src/components/workflow/store/workflow-save-coordinator.ts';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const snapshot = value => ({ value, fingerprint: JSON.stringify(value) });

test('flush cancels a pending debounce and persists before resolving', async () => {
  let current = { nodes: ['latest'] };
  const persisted = [];
  let scheduledCallback;
  let cleared = false;
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot(current),
    persistSnapshot: async value => {
      persisted.push(value);
      return value;
    },
    setTimer: callback => {
      scheduledCallback = callback;
      return 1;
    },
    clearTimer: () => {
      cleared = true;
    },
  });

  coordinator.schedule();
  await coordinator.flush();

  assert.equal(cleared, true);
  assert.deepEqual(persisted, [{ nodes: ['latest'] }]);
  assert.equal(typeof scheduledCallback, 'function');
});

test('flush joins an in-flight save and writes an edit made during that request', async () => {
  let current = { nodes: ['first'] };
  const firstWrite = deferred();
  const persisted = [];
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot(current),
    persistSnapshot: value => {
      persisted.push(value);
      return persisted.length === 1
        ? firstWrite.promise
        : Promise.resolve(value);
    },
    setTimer: callback => {
      callback();
      return 1;
    },
    clearTimer: () => undefined,
  });

  coordinator.schedule();
  await Promise.resolve();
  current = { nodes: ['second'] };
  coordinator.schedule();
  const flushPromise = coordinator.flush();

  assert.deepEqual(persisted, [{ nodes: ['first'] }]);
  firstWrite.resolve({ nodes: ['first'] });
  await flushPromise;

  assert.deepEqual(persisted, [{ nodes: ['first'] }, { nodes: ['second'] }]);
});

test('serial worker converges to the newest snapshot across continuous edits', async () => {
  let current = { nodes: ['v1'] };
  const writes = [deferred(), deferred(), deferred()];
  const persisted = [];
  const applied = [];
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot(current),
    persistSnapshot: value => {
      persisted.push(value);
      return writes[persisted.length - 1].promise;
    },
    onPersisted: result => applied.push(result),
    setTimer: callback => {
      callback();
      return 1;
    },
    clearTimer: () => undefined,
  });

  coordinator.schedule();
  await Promise.resolve();
  current = { nodes: ['v2'] };
  coordinator.schedule();
  writes[0].resolve({ server: 'v1' });
  await Promise.resolve();
  await Promise.resolve();

  current = { nodes: ['v3'] };
  coordinator.schedule();
  const flushPromise = coordinator.flush();
  writes[1].resolve({ server: 'v2' });
  await Promise.resolve();
  await Promise.resolve();
  writes[2].resolve({ server: 'v3' });
  await flushPromise;

  assert.deepEqual(persisted, [
    { nodes: ['v1'] },
    { nodes: ['v2'] },
    { nodes: ['v3'] },
  ]);
  assert.deepEqual(applied, [
    { server: 'v1' },
    { server: 'v2' },
    { server: 'v3' },
  ]);
});

test('flush detects a snapshot change even when no autosave was scheduled', async () => {
  let current = { nodes: ['before'] };
  const firstWrite = deferred();
  const persisted = [];
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot(current),
    persistSnapshot: value => {
      persisted.push(value);
      return persisted.length === 1
        ? firstWrite.promise
        : Promise.resolve(value);
    },
  });

  const flushPromise = coordinator.flush();
  await Promise.resolve();
  current = { nodes: ['after'] };
  firstWrite.resolve({ nodes: ['before'] });
  await flushPromise;

  assert.deepEqual(persisted, [{ nodes: ['before'] }, { nodes: ['after'] }]);
});

test('a failed save rejects the flush barrier', async () => {
  const expected = new Error('save failed');
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot({ nodes: ['draft'] }),
    persistSnapshot: async () => {
      throw expected;
    },
  });

  await assert.rejects(coordinator.flush(), expected);
});

test('a failed background save retries an edit queued while it was in flight', async () => {
  let current = { nodes: ['v1'] };
  const firstWrite = deferred();
  const writes = [];
  const backgroundErrors = [];
  const expected = new Error('v1 failed');
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot(current),
    persistSnapshot: value => {
      writes.push(value);
      return writes.length === 1 ? firstWrite.promise : Promise.resolve(value);
    },
    onBackgroundError: error => backgroundErrors.push(error),
    setTimer: callback => {
      callback();
      return 1;
    },
    clearTimer: () => undefined,
  });

  coordinator.schedule();
  await Promise.resolve();
  current = { nodes: ['v2'] };
  coordinator.schedule();
  firstWrite.reject(expected);
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(writes, [{ nodes: ['v1'] }, { nodes: ['v2'] }]);
  assert.deepEqual(backgroundErrors, [expected]);
});

test('a failed background save does not retry without a newer scheduled edit', async () => {
  const expected = new Error('save failed');
  const writes = [];
  const backgroundErrors = [];
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot({ nodes: ['draft'] }),
    persistSnapshot: async value => {
      writes.push(value);
      throw expected;
    },
    onBackgroundError: error => backgroundErrors.push(error),
    setTimer: callback => {
      callback();
      return 1;
    },
    clearTimer: () => undefined,
  });

  coordinator.schedule();
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(writes, [{ nodes: ['draft'] }]);
  assert.deepEqual(backgroundErrors, [expected]);
});

test('a successful save retries an edit queued before active-run cleanup', async () => {
  let current = { nodes: ['v1'] };
  const firstWrite = deferred();
  const writes = [];
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot(current),
    persistSnapshot: value => {
      writes.push(value);
      return writes.length === 1 ? firstWrite.promise : Promise.resolve(value);
    },
    setTimer: callback => {
      callback();
      return 1;
    },
    clearTimer: () => undefined,
  });

  coordinator.schedule();
  await Promise.resolve();
  firstWrite.resolve({ nodes: ['v1'] });
  queueMicrotask(() => {
    current = { nodes: ['v2'] };
    coordinator.schedule();
  });
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(writes, [{ nodes: ['v1'] }, { nodes: ['v2'] }]);
});

test('stale responses do not update client metadata after context changes', async () => {
  const write = deferred();
  let contextIsCurrent = true;
  const applied = [];
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot({ nodes: ['draft'] }),
    persistSnapshot: () => write.promise,
    isSnapshotCurrent: () => contextIsCurrent,
    onPersisted: result => applied.push(result),
  });

  const flushPromise = coordinator.flush();
  await Promise.resolve();
  contextIsCurrent = false;
  coordinator.reset();
  write.resolve({ server: 'stale' });
  await flushPromise;

  assert.deepEqual(applied, []);
});

test('reset keeps an in-flight write as a barrier for the next context', async () => {
  let current = { flowId: 'flow-a', nodes: ['old'] };
  const firstWrite = deferred();
  const writes = [];
  let concurrentWrites = 0;
  let maxConcurrentWrites = 0;
  const coordinator = createSaveCoordinator({
    captureSnapshot: () => snapshot(current),
    persistSnapshot: async value => {
      writes.push(value);
      concurrentWrites += 1;
      maxConcurrentWrites = Math.max(maxConcurrentWrites, concurrentWrites);
      try {
        if (writes.length === 1) await firstWrite.promise;
        return value;
      } finally {
        concurrentWrites -= 1;
      }
    },
    setTimer: callback => {
      callback();
      return 1;
    },
    clearTimer: () => undefined,
  });

  coordinator.schedule();
  await Promise.resolve();
  coordinator.reset();
  current = { flowId: 'flow-b', nodes: ['new'] };
  const nextFlush = coordinator.flush();

  await Promise.resolve();
  assert.deepEqual(writes, [{ flowId: 'flow-a', nodes: ['old'] }]);

  firstWrite.resolve({ ok: true });
  await nextFlush;

  assert.deepEqual(writes, [
    { flowId: 'flow-a', nodes: ['old'] },
    { flowId: 'flow-b', nodes: ['new'] },
  ]);
  assert.equal(maxConcurrentWrites, 1);
});

test('historical version previews are never eligible for draft persistence', () => {
  assert.equal(shouldPersistWorkflowDraft(false), true);
  assert.equal(shouldPersistWorkflowDraft(true), false);
});
