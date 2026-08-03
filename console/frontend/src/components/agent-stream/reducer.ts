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

const isAgentSegmentRecord = (value: unknown): boolean =>
  isRecord(value) &&
  isNonEmptyString(value.runId) &&
  isNonEmptyString(value.segmentId) &&
  isNonEmptyString(value.turnId) &&
  isSegmentSource(value.source) &&
  isSegmentChannel(value.channel) &&
  typeof value.text === 'string' &&
  typeof value.order === 'number' &&
  Number.isSafeInteger(value.order) &&
  typeof value.ended === 'boolean' &&
  typeof value.partial === 'boolean';

const isAgentToolRecord = (value: unknown): boolean =>
  isRecord(value) &&
  isNonEmptyString(value.runId) &&
  isNonEmptyString(value.callId) &&
  isNonEmptyString(value.turnId) &&
  isNonEmptyString(value.name) &&
  (value.status === 'running' || isFinishedToolStatus(value.status)) &&
  typeof value.order === 'number' &&
  Number.isSafeInteger(value.order);

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
  schemaVersion: 2,
  hasStructuredEvents: false,
  segments: {},
  tools: {},
  lastSeqByRun: {},
  nextOrder: 0,
  hasObservedToolByTurn: {},
  interrupted: false,
  interruptionReason: null,
});

const entityKey = (runId: string, id: string): string =>
  JSON.stringify([runId, id]);

const applyToolFinish = (
  existing: AgentToolRecord | undefined,
  order: number,
  event: AgentToolFinishEvent
): AgentToolRecord => {
  const tool: AgentToolRecord = existing
    ? { ...existing }
    : {
        runId: event.runId,
        callId: event.callId,
        turnId: event.turnId,
        name: event.name ?? 'unknown',
        arguments: null,
        status: event.status,
        order,
      };

  tool.status = event.status;
  if (event.name) tool.name = event.name;
  if (hasOwn(event as unknown as Record<string, unknown>, 'response')) {
    tool.response = event.response;
  }
  if (event.finishedAt !== undefined) tool.finishedAt = event.finishedAt;
  if (event.durationMs !== undefined) tool.durationMs = event.durationMs;
  return tool;
};

export const parseAgentStreamState = (
  value: unknown
): AgentStreamState | null => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 2 ||
    typeof value.hasStructuredEvents !== 'boolean' ||
    !isRecord(value.segments) ||
    !isRecord(value.tools) ||
    !isRecord(value.lastSeqByRun) ||
    typeof value.nextOrder !== 'number' ||
    !Number.isSafeInteger(value.nextOrder) ||
    !isRecord(value.hasObservedToolByTurn) ||
    typeof value.interrupted !== 'boolean' ||
    (value.interruptionReason !== null &&
      !isCommitReason(value.interruptionReason) &&
      value.interruptionReason !== 'transport_closed')
  ) {
    return null;
  }
  if (
    !Object.values(value.segments).every(isAgentSegmentRecord) ||
    !Object.values(value.tools).every(isAgentToolRecord) ||
    !Object.values(value.lastSeqByRun).every(
      seq => typeof seq === 'number' && Number.isSafeInteger(seq) && seq >= 0
    ) ||
    !Object.values(value.hasObservedToolByTurn).every(flag => flag === true)
  ) {
    return null;
  }
  return value as unknown as AgentStreamState;
};

const acceptEvent = (
  state: AgentStreamState,
  event: AgentEventV1
): AgentStreamState | null => {
  const lastSeq = state.lastSeqByRun[event.runId] ?? 0;
  if (event.seq <= lastSeq) return null;
  return {
    ...state,
    hasStructuredEvents: true,
    lastSeqByRun: { ...state.lastSeqByRun, [event.runId]: event.seq },
    nextOrder: state.nextOrder + 1,
  };
};

export const reduceAgentEvent = (
  state: AgentStreamState,
  event: AgentEventV1
): AgentStreamState => {
  const next = acceptEvent(state, event);
  if (!next) return state;
  const order = state.nextOrder;

  switch (event.type) {
    case 'segment_start': {
      const key = entityKey(event.runId, event.segmentId);
      if (state.segments[key]) return next;
      return {
        ...next,
        segments: {
          ...state.segments,
          [key]: {
            runId: event.runId,
            segmentId: event.segmentId,
            turnId: event.turnId,
            source: event.source,
            channel: event.channel,
            text: '',
            order,
            ended: false,
            partial: false,
          },
        },
      };
    }
    case 'segment_delta': {
      const key = entityKey(event.runId, event.segmentId);
      const segment = state.segments[key];
      if (!segment) return next;
      return {
        ...next,
        segments: {
          ...state.segments,
          [key]: { ...segment, text: segment.text + event.delta },
        },
      };
    }
    case 'segment_end': {
      const key = entityKey(event.runId, event.segmentId);
      const segment = state.segments[key];
      if (!segment) return next;
      return {
        ...next,
        segments: {
          ...state.segments,
          [key]: { ...segment, ended: true },
        },
      };
    }
    case 'turn_commit': {
      let segments = state.segments;
      for (const [key, segment] of Object.entries(state.segments)) {
        if (
          segment.runId === event.runId &&
          segment.turnId === event.turnId &&
          segment.channel === 'pending'
        ) {
          if (segments === state.segments) segments = { ...state.segments };
          segments[key] = {
            ...segment,
            channel: event.channel,
            partial: event.partial,
            commitReason: event.reason,
          };
        }
      }
      return {
        ...next,
        segments,
        ...(event.partial
          ? { interrupted: true, interruptionReason: event.reason }
          : {}),
      };
    }
    case 'tool_start': {
      const key = entityKey(event.runId, event.callId);
      const turnKey = entityKey(event.runId, event.turnId);
      return {
        ...next,
        hasObservedToolByTurn: {
          ...state.hasObservedToolByTurn,
          [turnKey]: true,
        },
        tools: {
          ...state.tools,
          [key]: {
            runId: event.runId,
            callId: event.callId,
            turnId: event.turnId,
            name: event.name,
            arguments: event.arguments,
            status: 'running',
            order: state.tools[key]?.order ?? order,
            ...(event.startedAt === undefined
              ? {}
              : { startedAt: event.startedAt }),
          },
        },
      };
    }
    case 'tool_progress': {
      const key = entityKey(event.runId, event.callId);
      const tool = state.tools[key];
      if (!tool) return next;
      return {
        ...next,
        tools: {
          ...state.tools,
          [key]: { ...tool, progress: event.summary },
        },
      };
    }
    case 'tool_finish': {
      const key = entityKey(event.runId, event.callId);
      return {
        ...next,
        tools: {
          ...state.tools,
          [key]: applyToolFinish(state.tools[key], order, event),
        },
      };
    }
  }
};

export const finalizePendingSegments = (
  state: AgentStreamState,
  reason: AgentFinalizeReason
): AgentStreamState => {
  if (!state.hasStructuredEvents) return state;

  const pending = Object.values(state.segments).filter(
    segment => segment.channel === 'pending'
  );
  const hasRunningTools = Object.values(state.tools).some(
    tool => tool.status === 'running'
  );
  if (pending.length === 0 && !hasRunningTools && state.interrupted) {
    return state;
  }

  let segments = state.segments;
  for (const [key, segment] of Object.entries(state.segments)) {
    if (segment.channel !== 'pending') continue;
    if (segments === state.segments) segments = { ...state.segments };
    segments[key] = {
      ...segment,
      channel: state.hasObservedToolByTurn[
        entityKey(segment.runId, segment.turnId)
      ]
        ? 'reasoning'
        : 'content',
      partial: true,
      commitReason: reason,
    };
  }
  let tools = state.tools;
  for (const [key, tool] of Object.entries(state.tools)) {
    if (tool.status !== 'running') continue;
    if (tools === state.tools) tools = { ...state.tools };
    tools[key] = {
      ...tool,
      status:
        reason === 'error' || reason === 'transport_closed'
          ? 'error'
          : 'cancelled',
    };
  }
  return {
    ...state,
    segments,
    tools,
    interrupted: true,
    interruptionReason: reason,
  };
};

export const selectLiveContent = (state: AgentStreamState): string =>
  Object.values(state.segments)
    .filter(
      segment => segment.channel === 'pending' || segment.channel === 'content'
    )
    .sort((left, right) => left.order - right.order)
    .map(segment => segment.text)
    .join('');

export const selectHasPartialContent = (state: AgentStreamState): boolean =>
  Object.values(state.segments).some(
    segment => segment.channel === 'content' && segment.partial
  );

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
      runId: tool.runId,
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
