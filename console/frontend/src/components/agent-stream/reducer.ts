import type {
  AgentCommitChannel,
  AgentCommitReason,
  AgentEventV1,
  AgentFinalizeReason,
  AgentReasoningTimelineItem,
  AgentSegmentChannel,
  AgentSegmentSource,
  AgentStreamState,
  AgentToolFinishEvent,
  AgentToolRecord,
  AgentToolStatus,
} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isOptionalFiniteNumber = (value: unknown): boolean =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value));

const isSegmentSource = (value: unknown): value is AgentSegmentSource =>
  value === 'text' || value === 'thinking';

const isSegmentChannel = (value: unknown): value is AgentSegmentChannel =>
  value === 'pending' || value === 'reasoning' || value === 'content';

const isCommitChannel = (value: unknown): value is AgentCommitChannel =>
  value === 'reasoning' || value === 'content';

const isCommitReason = (value: unknown): value is AgentCommitReason =>
  value === 'tool_call' ||
  value === 'message_end' ||
  value === 'cancelled' ||
  value === 'error';

const isFinishedToolStatus = (
  value: unknown
): value is Exclude<AgentToolStatus, 'running'> =>
  value === 'success' || value === 'error' || value === 'cancelled';

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

export const parseAgentEvent = (value: unknown): AgentEventV1 | null => {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isNonEmptyString(value.runId) ||
    typeof value.seq !== 'number' ||
    !Number.isSafeInteger(value.seq) ||
    !isNonEmptyString(value.turnId) ||
    !isNonEmptyString(value.type)
  ) {
    return null;
  }

  switch (value.type) {
    case 'segment_start':
      if (
        !isNonEmptyString(value.segmentId) ||
        !isSegmentSource(value.source) ||
        !isSegmentChannel(value.channel)
      ) {
        return null;
      }
      break;
    case 'segment_delta':
      if (
        !isNonEmptyString(value.segmentId) ||
        typeof value.delta !== 'string'
      ) {
        return null;
      }
      break;
    case 'segment_end':
      if (!isNonEmptyString(value.segmentId)) return null;
      break;
    case 'turn_commit':
      if (
        !isCommitChannel(value.channel) ||
        typeof value.partial !== 'boolean' ||
        !isCommitReason(value.reason)
      ) {
        return null;
      }
      break;
    case 'tool_start':
      if (
        !isNonEmptyString(value.callId) ||
        !isNonEmptyString(value.name) ||
        !hasOwn(value, 'arguments') ||
        (value.status !== undefined && value.status !== 'running') ||
        !isOptionalFiniteNumber(value.startedAt)
      ) {
        return null;
      }
      break;
    case 'tool_progress':
      if (
        !isNonEmptyString(value.callId) ||
        typeof value.summary !== 'string'
      ) {
        return null;
      }
      break;
    case 'tool_finish':
      if (
        !isNonEmptyString(value.callId) ||
        (value.name !== undefined && !isNonEmptyString(value.name)) ||
        !isFinishedToolStatus(value.status) ||
        !isOptionalFiniteNumber(value.finishedAt) ||
        !isOptionalFiniteNumber(value.durationMs)
      ) {
        return null;
      }
      break;
    default:
      return null;
  }

  return value as unknown as AgentEventV1;
};

export const createAgentStreamState = (): AgentStreamState => ({
  hasStructuredEvents: false,
  segments: {},
  tools: {},
  seen: {},
  hasObservedToolByTurn: {},
  interrupted: false,
  interruptionReason: null,
});

const cloneState = (state: AgentStreamState): AgentStreamState => ({
  ...state,
  segments: Object.fromEntries(
    Object.entries(state.segments).map(([id, segment]) => [id, { ...segment }])
  ),
  tools: Object.fromEntries(
    Object.entries(state.tools).map(([id, tool]) => [id, { ...tool }])
  ),
  seen: { ...state.seen },
  hasObservedToolByTurn: { ...state.hasObservedToolByTurn },
});

const applyToolFinish = (
  next: AgentStreamState,
  event: AgentToolFinishEvent
): void => {
  const existing = next.tools[event.callId];
  const tool: AgentToolRecord = existing ?? {
    callId: event.callId,
    turnId: event.turnId,
    name: event.name ?? 'unknown',
    arguments: null,
    status: event.status,
    order: event.seq,
  };

  tool.status = event.status;
  if (event.name) tool.name = event.name;
  if (hasOwn(event as unknown as Record<string, unknown>, 'response')) {
    tool.response = event.response;
  }
  if (event.finishedAt !== undefined) tool.finishedAt = event.finishedAt;
  if (event.durationMs !== undefined) tool.durationMs = event.durationMs;
  next.tools[event.callId] = tool;
};

export const reduceAgentEvent = (
  state: AgentStreamState,
  event: AgentEventV1
): AgentStreamState => {
  const eventKey = `${event.runId}:${event.seq}`;
  if (state.seen[eventKey]) return state;

  const next = cloneState(state);
  next.seen[eventKey] = true;
  next.hasStructuredEvents = true;

  switch (event.type) {
    case 'segment_start':
      if (!next.segments[event.segmentId]) {
        next.segments[event.segmentId] = {
          segmentId: event.segmentId,
          turnId: event.turnId,
          source: event.source,
          channel: event.channel,
          text: '',
          order: event.seq,
          ended: false,
          partial: false,
        };
      }
      break;
    case 'segment_delta': {
      const segment = next.segments[event.segmentId];
      if (segment) segment.text += event.delta;
      break;
    }
    case 'segment_end': {
      const segment = next.segments[event.segmentId];
      if (segment) segment.ended = true;
      break;
    }
    case 'turn_commit':
      for (const segment of Object.values(next.segments)) {
        if (segment.turnId === event.turnId && segment.channel === 'pending') {
          segment.channel = event.channel;
          segment.partial = event.partial;
          segment.commitReason = event.reason;
        }
      }
      if (event.partial) {
        next.interrupted = true;
        next.interruptionReason = event.reason;
      }
      break;
    case 'tool_start':
      next.hasObservedToolByTurn[event.turnId] = true;
      next.tools[event.callId] = {
        callId: event.callId,
        turnId: event.turnId,
        name: event.name,
        arguments: event.arguments,
        status: 'running',
        order: next.tools[event.callId]?.order ?? event.seq,
        ...(event.startedAt === undefined
          ? {}
          : { startedAt: event.startedAt }),
      };
      break;
    case 'tool_progress': {
      const tool = next.tools[event.callId];
      if (tool) tool.progress = event.summary;
      break;
    }
    case 'tool_finish':
      applyToolFinish(next, event);
      break;
  }

  return next;
};

export const finalizePendingSegments = (
  state: AgentStreamState,
  reason: AgentFinalizeReason
): AgentStreamState => {
  if (!state.hasStructuredEvents) return state;

  const pending = Object.values(state.segments).filter(
    segment => segment.channel === 'pending'
  );
  if (pending.length === 0 && state.interrupted) return state;

  const next = cloneState(state);
  for (const segment of Object.values(next.segments)) {
    if (segment.channel !== 'pending') continue;
    segment.channel = next.hasObservedToolByTurn[segment.turnId]
      ? 'reasoning'
      : 'content';
    segment.partial = true;
    segment.commitReason = reason;
  }
  next.interrupted = true;
  next.interruptionReason = reason;
  return next;
};

export const selectLiveContent = (state: AgentStreamState): string =>
  Object.values(state.segments)
    .filter(
      segment => segment.channel === 'pending' || segment.channel === 'content'
    )
    .sort((left, right) => left.order - right.order)
    .map(segment => segment.text)
    .join('');

export const selectReasoningTimeline = (
  state: AgentStreamState
): AgentReasoningTimelineItem[] => {
  const reasoning: AgentReasoningTimelineItem[] = Object.values(state.segments)
    .filter(
      segment => segment.channel === 'reasoning' && segment.text.length > 0
    )
    .map(segment => ({ kind: 'reasoning', ...segment }));
  const tools: AgentReasoningTimelineItem[] = Object.values(state.tools).map(
    tool => ({
      kind: 'tool',
      callId: tool.callId,
      turnId: tool.turnId,
      order: tool.order,
      tool,
    })
  );

  return [...reasoning, ...tools].sort(
    (left, right) => left.order - right.order
  );
};
