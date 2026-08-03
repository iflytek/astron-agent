import type { AssistantMessage, AssistantMessageEvent } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";

import { TurnStreamProjector } from "../src/turn-stream.js";

function usage() {
  return {
    input: 1,
    output: 1,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 2,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function assistant(content: AssistantMessage["content"]): AssistantMessage {
  return {
    role: "assistant",
    content,
    api: "openai-completions",
    provider: "openai",
    model: "fake-model",
    usage: usage(),
    stopReason: "pending",
    timestamp: 1,
  };
}

function textDelta(delta: string): AssistantMessageEvent {
  return {
    type: "text_delta",
    contentIndex: 0,
    delta,
    partial: assistant([{ type: "text", text: delta }]),
  };
}

describe("TurnStreamProjector", () => {
  it("streams normal text before committing it as final content", () => {
    const projector = new TurnStreamProjector("run-1");
    projector.startTurn("turn-1");

    const streamed = projector.handle(textDelta("Hi"));

    expect(streamed.events).toMatchObject([
      {
        type: "segment_start",
        turnId: "turn-1",
        segmentId: "turn-1-text-0",
        source: "text",
        channel: "pending",
      },
      {
        type: "segment_delta",
        turnId: "turn-1",
        segmentId: "turn-1-text-0",
        delta: "Hi",
      },
    ]);
    expect(streamed.legacyContent).toBe("");
    expect(streamed.legacyReasoning).toBe("");

    const committed = projector.finishMessage("stop");

    expect(committed.events).toMatchObject([
      {
        type: "turn_commit",
        turnId: "turn-1",
        channel: "content",
        partial: false,
        reason: "message_end",
      },
    ]);
    expect(committed.legacyContent).toBe("Hi");
    expect(committed.legacyReasoning).toBe("");
  });

  it("reclassifies pre-tool text as reasoning exactly once", () => {
    const projector = new TurnStreamProjector("run-1");
    projector.startTurn("turn-1");
    projector.handle(textDelta("Checking"));

    const committed = projector.markToolCall();
    const repeated = projector.markToolCall();

    expect(committed.events).toMatchObject([
      {
        type: "turn_commit",
        turnId: "turn-1",
        channel: "reasoning",
        partial: false,
        reason: "tool_call",
      },
    ]);
    expect(committed.legacyReasoning).toBe("Checking");
    expect(repeated.events).toEqual([]);
    expect(repeated.legacyReasoning).toBe("");
    expect(projector.finishMessage("toolUse").legacyReasoning).toBe("");
  });

  it("streams provider thinking directly into reasoning", () => {
    const projector = new TurnStreamProjector("run-1");
    projector.startTurn("turn-1");
    const partial = assistant([{ type: "thinking", thinking: "Plan" }]);

    const started = projector.handle({
      type: "thinking_start",
      contentIndex: 0,
      partial,
    });
    const streamed = projector.handle({
      type: "thinking_delta",
      contentIndex: 0,
      delta: "Plan",
      partial,
    });
    const ended = projector.handle({
      type: "thinking_end",
      contentIndex: 0,
      content: "Plan",
      partial,
    });

    expect(started.events[0]).toMatchObject({
      type: "segment_start",
      segmentId: "turn-1-thinking-0",
      source: "thinking",
      channel: "reasoning",
    });
    expect(streamed.events[0]).toMatchObject({
      type: "segment_delta",
      segmentId: "turn-1-thinking-0",
      delta: "Plan",
    });
    expect(streamed.legacyReasoning).toBe("Plan");
    expect(ended.events[0]).toMatchObject({
      type: "segment_end",
      segmentId: "turn-1-thinking-0",
    });
  });

  it("commits visible text as partial content on cancellation", () => {
    const projector = new TurnStreamProjector("run-1");
    projector.startTurn("turn-1");
    projector.handle(textDelta("Partial"));

    const cancelled = projector.flushPartial("cancelled");
    const repeated = projector.flushPartial("cancelled");

    expect(cancelled.events).toMatchObject([
      {
        type: "turn_commit",
        channel: "content",
        partial: true,
        reason: "cancelled",
      },
    ]);
    expect(cancelled.legacyContent).toBe("Partial");
    expect(repeated.events).toEqual([]);
    expect(repeated.legacyContent).toBe("");
  });
});
