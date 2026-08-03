import type { AssistantMessageEvent } from "@earendil-works/pi-ai";

import type { PiStreamEvent } from "./protocol.js";

export type TurnProjection = {
  events: PiStreamEvent[];
  legacyContent: string;
  legacyReasoning: string;
};

type TextChannel = "pending" | "reasoning" | "content";
type SegmentSource = "text" | "thinking";

type SegmentState = {
  id: string;
  source: SegmentSource;
  text: string;
  projectedLength: number;
  ended: boolean;
};

const emptyProjection = (): TurnProjection => ({
  events: [],
  legacyContent: "",
  legacyReasoning: "",
});

export class TurnStreamProjector {
  private currentTurnId = "";
  private readonly segments = new Map<string, SegmentState>();
  private textChannel: TextChannel = "pending";
  private toolObserved = false;
  private partialCommitted = false;
  private messageFinished = false;

  constructor(private readonly runId: string) {}

  get turnId(): string {
    return this.currentTurnId;
  }

  startTurn(turnId: string): void {
    this.currentTurnId = turnId;
    this.segments.clear();
    this.textChannel = "pending";
    this.toolObserved = false;
    this.partialCommitted = false;
    this.messageFinished = false;
  }

  handle(update: AssistantMessageEvent): TurnProjection {
    if (!this.currentTurnId) return emptyProjection();
    switch (update.type) {
      case "text_start":
        return {
          ...emptyProjection(),
          events: this.ensureSegment("text", update.contentIndex),
        };
      case "text_delta":
        return this.appendDelta("text", update.contentIndex, update.delta);
      case "text_end":
        return {
          ...emptyProjection(),
          events: this.endSegment("text", update.contentIndex),
        };
      case "thinking_start":
        return {
          ...emptyProjection(),
          events: this.ensureSegment("thinking", update.contentIndex),
        };
      case "thinking_delta":
        return this.appendDelta("thinking", update.contentIndex, update.delta);
      case "thinking_end":
        return {
          ...emptyProjection(),
          events: this.endSegment("thinking", update.contentIndex),
        };
      default:
        return emptyProjection();
    }
  }

  markToolCall(): TurnProjection {
    this.toolObserved = true;
    return this.commit("reasoning", false, "tool_call");
  }

  finishMessage(stopReason: string, hasToolCall = false): TurnProjection {
    if (hasToolCall) this.toolObserved = true;
    this.messageFinished = true;
    if (stopReason === "aborted" || stopReason === "error") {
      return this.commit(
        this.toolObserved ? "reasoning" : "content",
        true,
        stopReason === "aborted" ? "cancelled" : "error",
      );
    }
    return this.commit(
      this.toolObserved || hasToolCall ? "reasoning" : "content",
      false,
      this.toolObserved || hasToolCall ? "tool_call" : "message_end",
    );
  }

  flushPartial(reason: "cancelled" | "error"): TurnProjection {
    if (!this.currentTurnId || this.messageFinished || this.partialCommitted) {
      return emptyProjection();
    }
    return this.commit(
      this.toolObserved ? "reasoning" : "content",
      true,
      reason,
    );
  }

  private segmentId(source: SegmentSource, contentIndex: number): string {
    return `${this.currentTurnId}-${source}-${contentIndex}`;
  }

  private ensureSegment(
    source: SegmentSource,
    contentIndex: number,
  ): PiStreamEvent[] {
    const id = this.segmentId(source, contentIndex);
    if (this.segments.has(id)) return [];
    this.segments.set(id, {
      id,
      source,
      text: "",
      projectedLength: 0,
      ended: false,
    });
    return [
      {
        version: 1,
        runId: this.runId,
        type: "segment_start",
        turnId: this.currentTurnId,
        segmentId: id,
        source,
        channel: source === "thinking" ? "reasoning" : this.textChannel,
      },
    ];
  }

  private appendDelta(
    source: SegmentSource,
    contentIndex: number,
    delta: string,
  ): TurnProjection {
    const events = this.ensureSegment(source, contentIndex);
    const id = this.segmentId(source, contentIndex);
    const segment = this.segments.get(id);
    if (!segment || !delta) return { ...emptyProjection(), events };
    segment.text += delta;
    events.push({
      version: 1,
      runId: this.runId,
      type: "segment_delta",
      turnId: this.currentTurnId,
      segmentId: id,
      delta,
    });
    const projection = { ...emptyProjection(), events };
    if (source === "thinking" || this.textChannel === "reasoning") {
      projection.legacyReasoning = delta;
      segment.projectedLength = segment.text.length;
    } else if (this.textChannel === "content") {
      projection.legacyContent = delta;
      segment.projectedLength = segment.text.length;
    }
    return projection;
  }

  private endSegment(
    source: SegmentSource,
    contentIndex: number,
  ): PiStreamEvent[] {
    const events = this.ensureSegment(source, contentIndex);
    const id = this.segmentId(source, contentIndex);
    const segment = this.segments.get(id);
    if (!segment || segment.ended) return events;
    segment.ended = true;
    events.push({
      version: 1,
      runId: this.runId,
      type: "segment_end",
      turnId: this.currentTurnId,
      segmentId: id,
    });
    return events;
  }

  private commit(
    channel: "reasoning" | "content",
    partial: boolean,
    reason: "tool_call" | "message_end" | "cancelled" | "error",
  ): TurnProjection {
    if (!this.currentTurnId) return emptyProjection();
    const alreadyCommitted = this.textChannel !== "pending";
    if (alreadyCommitted && (!partial || this.partialCommitted)) {
      return emptyProjection();
    }

    this.textChannel = channel;
    this.partialCommitted = partial;
    const projection = emptyProjection();
    projection.events.push({
      version: 1,
      runId: this.runId,
      type: "turn_commit",
      turnId: this.currentTurnId,
      channel,
      partial,
      reason,
    });

    for (const segment of this.segments.values()) {
      if (segment.source !== "text") continue;
      const unprojected = segment.text.slice(segment.projectedLength);
      if (!unprojected) continue;
      if (channel === "reasoning") projection.legacyReasoning += unprojected;
      else projection.legacyContent += unprojected;
      segment.projectedLength = segment.text.length;
    }
    return projection;
  }
}
