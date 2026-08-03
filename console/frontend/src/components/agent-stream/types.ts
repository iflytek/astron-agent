export type AgentSegmentSource = 'text' | 'thinking';
export type AgentSegmentChannel = 'pending' | 'reasoning' | 'content';
export type AgentCommitChannel = Exclude<AgentSegmentChannel, 'pending'>;
export type AgentCommitReason =
  | 'tool_call'
  | 'message_end'
  | 'cancelled'
  | 'error';
export type AgentFinalizeReason = AgentCommitReason | 'transport_closed';
export type AgentToolStatus = 'running' | 'success' | 'error' | 'cancelled';

interface AgentEventBase {
  version: 1;
  runId: string;
  seq: number;
  turnId: string;
}

export interface AgentSegmentStartEvent extends AgentEventBase {
  type: 'segment_start';
  segmentId: string;
  source: AgentSegmentSource;
  channel: AgentSegmentChannel;
}

export interface AgentSegmentDeltaEvent extends AgentEventBase {
  type: 'segment_delta';
  segmentId: string;
  delta: string;
}

export interface AgentSegmentEndEvent extends AgentEventBase {
  type: 'segment_end';
  segmentId: string;
}

export interface AgentTurnCommitEvent extends AgentEventBase {
  type: 'turn_commit';
  channel: AgentCommitChannel;
  partial: boolean;
  reason: AgentCommitReason;
}

export interface AgentToolStartEvent extends AgentEventBase {
  type: 'tool_start';
  callId: string;
  name: string;
  arguments: unknown;
  status?: 'running';
  startedAt?: number;
}

export interface AgentToolProgressEvent extends AgentEventBase {
  type: 'tool_progress';
  callId: string;
  summary: string;
}

export interface AgentToolFinishEvent extends AgentEventBase {
  type: 'tool_finish';
  callId: string;
  name?: string;
  response?: unknown;
  status: Exclude<AgentToolStatus, 'running'>;
  finishedAt?: number;
  durationMs?: number;
}

export type AgentEventV1 =
  | AgentSegmentStartEvent
  | AgentSegmentDeltaEvent
  | AgentSegmentEndEvent
  | AgentTurnCommitEvent
  | AgentToolStartEvent
  | AgentToolProgressEvent
  | AgentToolFinishEvent;

export interface AgentSegment {
  segmentId: string;
  turnId: string;
  source: AgentSegmentSource;
  channel: AgentSegmentChannel;
  text: string;
  order: number;
  ended: boolean;
  partial: boolean;
  commitReason?: AgentFinalizeReason;
}

export interface AgentToolRecord {
  callId: string;
  turnId: string;
  name: string;
  arguments: unknown;
  response?: unknown;
  progress?: string;
  status: AgentToolStatus;
  order: number;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
}

export interface AgentStreamState {
  hasStructuredEvents: boolean;
  segments: Record<string, AgentSegment>;
  tools: Record<string, AgentToolRecord>;
  seen: Record<string, true>;
  hasObservedToolByTurn: Record<string, true>;
  interrupted: boolean;
  interruptionReason: AgentFinalizeReason | null;
}

export type AgentReasoningTimelineItem =
  | ({ kind: 'reasoning' } & AgentSegment)
  | {
      kind: 'tool';
      callId: string;
      turnId: string;
      order: number;
      tool: AgentToolRecord;
    };
