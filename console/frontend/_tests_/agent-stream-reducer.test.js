import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAgentStreamState,
  finalizePendingSegments,
  parseAgentEvent,
  reduceAgentEvent,
  selectHasPartialContent,
  selectLiveContent,
  selectReasoningTimeline,
} from '../src/components/agent-stream/reducer.ts';

const segmentStart = seq => ({
  version: 1,
  runId: 'run-1',
  seq,
  type: 'segment_start',
  turnId: 'turn-1',
  segmentId: 'turn-1-text-0',
  source: 'text',
  channel: 'pending',
});

const segmentDelta = (seq, delta = 'Checking') => ({
  version: 1,
  runId: 'run-1',
  seq,
  type: 'segment_delta',
  turnId: 'turn-1',
  segmentId: 'turn-1-text-0',
  delta,
});

const reasoningCommit = seq => ({
  version: 1,
  runId: 'run-1',
  seq,
  type: 'turn_commit',
  turnId: 'turn-1',
  channel: 'reasoning',
  partial: false,
  reason: 'tool_call',
});

const toolStarted = seq => ({
  version: 1,
  runId: 'run-1',
  seq,
  type: 'tool_start',
  turnId: 'turn-1',
  callId: 'call-1',
  name: 'status',
  arguments: { id: '7' },
  status: 'running',
  startedAt: 1,
});

const toolFinished = seq => ({
  version: 1,
  runId: 'run-1',
  seq,
  type: 'tool_finish',
  turnId: 'turn-1',
  callId: 'call-1',
  name: 'status',
  response: { ready: true },
  status: 'success',
  finishedAt: 2,
  durationMs: 1,
});

test('pending answer becomes reasoning without duplicate text', () => {
  let state = createAgentStreamState();
  state = reduceAgentEvent(state, segmentStart(1));
  state = reduceAgentEvent(state, segmentDelta(2));
  assert.equal(selectLiveContent(state), 'Checking');

  state = reduceAgentEvent(state, reasoningCommit(3));

  assert.equal(selectLiveContent(state), '');
  const timeline = selectReasoningTimeline(state);
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0]?.kind, 'reasoning');
  assert.equal(
    timeline[0]?.kind === 'reasoning' ? timeline[0].text : '',
    'Checking'
  );
});

test('duplicate seq and repeated tool finish are idempotent', () => {
  const once = reduceAgentEvent(createAgentStreamState(), toolStarted(1));
  const twice = reduceAgentEvent(once, toolStarted(1));
  assert.equal(twice, once);

  const finished = reduceAgentEvent(twice, toolFinished(2));
  const repeated = reduceAgentEvent(finished, toolFinished(3));
  assert.equal(Object.keys(repeated.tools).length, 1);
  assert.equal(repeated.tools['call-1']?.status, 'success');
});

test('reasoning segments and tools retain chronological order', () => {
  let state = createAgentStreamState();
  state = reduceAgentEvent(state, segmentStart(1));
  state = reduceAgentEvent(state, segmentDelta(2));
  state = reduceAgentEvent(state, reasoningCommit(3));
  state = reduceAgentEvent(state, toolStarted(4));
  state = reduceAgentEvent(state, toolFinished(5));

  assert.deepEqual(
    selectReasoningTimeline(state).map(item => item.kind),
    ['reasoning', 'tool']
  );
});

test('transport finalization preserves partial text and classifies by tool use', () => {
  let answerState = createAgentStreamState();
  answerState = reduceAgentEvent(answerState, segmentStart(1));
  answerState = reduceAgentEvent(
    answerState,
    segmentDelta(2, 'Partial answer')
  );
  answerState = finalizePendingSegments(answerState, 'transport_closed');
  assert.equal(selectLiveContent(answerState), 'Partial answer');
  assert.equal(selectHasPartialContent(answerState), true);
  assert.equal(answerState.segments['turn-1-text-0']?.partial, true);
  assert.equal(answerState.interrupted, true);

  let reasoningState = createAgentStreamState();
  reasoningState = reduceAgentEvent(reasoningState, segmentStart(1));
  reasoningState = reduceAgentEvent(
    reasoningState,
    segmentDelta(2, 'Checking')
  );
  reasoningState = reduceAgentEvent(reasoningState, toolStarted(3));
  reasoningState = finalizePendingSegments(reasoningState, 'cancelled');
  assert.equal(selectLiveContent(reasoningState), '');
  assert.equal(selectHasPartialContent(reasoningState), false);
  assert.equal(reasoningState.tools['call-1']?.status, 'cancelled');
  const item = selectReasoningTimeline(reasoningState)[0];
  assert.equal(item?.kind, 'reasoning');
  assert.equal(item?.kind === 'reasoning' ? item.text : '', 'Checking');
});

test('parser accepts valid events and rejects unknown or malformed versions', () => {
  assert.deepEqual(parseAgentEvent(segmentStart(1)), segmentStart(1));
  assert.equal(parseAgentEvent({ version: 2, type: 'segment_delta' }), null);
  assert.equal(
    parseAgentEvent({
      version: 1,
      runId: 'run-1',
      seq: 1.5,
      type: 'segment_delta',
      turnId: 'turn-1',
      segmentId: 'segment-1',
      delta: 'x',
    }),
    null
  );
  assert.equal(
    parseAgentEvent({
      version: 1,
      runId: 'run-1',
      seq: 1,
      type: 'tool_start',
      turnId: 'turn-1',
      callId: '',
      name: 'lookup',
      arguments: {},
    }),
    null
  );
});

test('state remains JSON serializable after every event type', () => {
  let state = createAgentStreamState();
  const events = [
    segmentStart(1),
    segmentDelta(2),
    {
      version: 1,
      runId: 'run-1',
      seq: 3,
      type: 'segment_end',
      turnId: 'turn-1',
      segmentId: 'turn-1-text-0',
    },
    reasoningCommit(4),
    toolStarted(5),
    {
      version: 1,
      runId: 'run-1',
      seq: 6,
      type: 'tool_progress',
      turnId: 'turn-1',
      callId: 'call-1',
      summary: 'waiting',
    },
    toolFinished(7),
  ];

  for (const event of events) state = reduceAgentEvent(state, event);

  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});
