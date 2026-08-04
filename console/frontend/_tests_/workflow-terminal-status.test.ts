import assert from 'node:assert/strict';
import test from 'node:test';
import { settleRunningNodes } from '../src/components/workflow/store/workflow-terminal-status.ts';

test('successful workflow settles a leftover running node as success', () => {
  const nodes = [
    {
      id: 'end',
      data: {
        status: 'running',
        debuggerResult: { cancelReason: 'stale reason' },
      },
    },
  ];

  const settled = settleRunningNodes(nodes, true, 'workflow terminated');

  assert.equal(settled[0]?.data.status, 'success');
  assert.equal(settled[0]?.data.debuggerResult.cancelReason, undefined);
  assert.equal(nodes[0]?.data.status, 'running');
});

test('failed workflow cancels a leftover running node with the termination reason', () => {
  const settled = settleRunningNodes(
    [{ id: 'end', data: { status: 'running', debuggerResult: {} } }],
    false,
    'workflow terminated'
  );

  assert.equal(settled[0]?.data.status, 'cancel');
  assert.equal(
    settled[0]?.data.debuggerResult.cancelReason,
    'workflow terminated'
  );
});
