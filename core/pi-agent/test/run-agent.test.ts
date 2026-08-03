import {
  EventStream,
  type AssistantMessage,
  type AssistantMessageEvent,
  type Context,
  type Model,
} from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";

import type { StartMessage } from "../src/protocol.js";
import { runPiAgent } from "../src/run-agent.js";

class MockAssistantStream extends EventStream<
  AssistantMessageEvent,
  AssistantMessage
> {
  constructor() {
    super(
      (event) => event.type === "done" || event.type === "error",
      (event) => {
        if (event.type === "done") return event.message;
        if (event.type === "error") return event.error;
        throw new Error("unexpected mock event");
      },
    );
  }
}

function usage() {
  return {
    input: 12,
    output: 5,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 17,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function model(): Model<"openai-completions"> {
  return {
    id: "fake-model",
    name: "fake-model",
    provider: "openai",
    api: "openai-completions",
    baseUrl: "https://models.example/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8_192,
  };
}

const start: StartMessage = {
  type: "start",
  runId: "run-native-loop",
  model: {
    id: "fake-model",
    provider: "openai",
    baseUrl: "https://models.example/v1",
    apiKey: "model-key",
  },
  systemPrompt: "Follow the business instruction.",
  messages: [
    { role: "user", content: "Earlier question" },
    { role: "assistant", content: "Earlier answer" },
  ],
  question: "Current question",
  tools: [],
};

describe("runPiAgent", () => {
  it("uses Pi's native event loop and projects reasoning, text and usage", async () => {
    let capturedContext: Context | undefined;
    const streamFn = (_model: Model<any>, context: Context) => {
      capturedContext = context;
      const stream = new MockAssistantStream();
      queueMicrotask(() => {
        const initial: AssistantMessage = {
          role: "assistant",
          content: [],
          api: "openai-completions",
          provider: "openai",
          model: "fake-model",
          usage: usage(),
          stopReason: "pending",
          timestamp: 1,
        };
        const thinking: AssistantMessage = {
          ...initial,
          content: [{ type: "thinking", thinking: "checking" }],
        };
        const text: AssistantMessage = {
          ...initial,
          content: [
            { type: "thinking", thinking: "checking" },
            { type: "text", text: "ready" },
          ],
        };
        const final: AssistantMessage = {
          ...text,
          stopReason: "stop",
        };
        stream.push({ type: "start", partial: initial });
        stream.push({
          type: "thinking_delta",
          contentIndex: 0,
          delta: "checking",
          partial: thinking,
        });
        stream.push({
          type: "text_delta",
          contentIndex: 1,
          delta: "ready",
          partial: text,
        });
        stream.push({ type: "done", reason: "stop", message: final });
      });
      return stream;
    };

    const sent: unknown[] = [];
    await runPiAgent(
      start,
      async (message) => {
        sent.push(message);
      },
      undefined,
      { modelRuntime: { model: model(), streamFn } },
    );

    expect(capturedContext?.systemPrompt).toBe("Follow the business instruction.");
    expect(capturedContext?.messages).toEqual([
      { role: "user", content: "Earlier question", timestamp: expect.any(Number) },
      {
        role: "assistant",
        content: [{ type: "text", text: "Earlier answer" }],
        api: "openai-completions",
        provider: "openai",
        model: "fake-model",
        usage: expect.any(Object),
        stopReason: "stop",
        timestamp: expect.any(Number),
      },
      { role: "user", content: "Current question", timestamp: expect.any(Number) },
    ]);
    expect(sent).toEqual([
      { type: "reasoning_delta", delta: "checking" },
      { type: "content_delta", delta: "ready" },
      { type: "usage", inputTokens: 12, outputTokens: 5, totalTokens: 17 },
      { type: "done" },
    ]);
  });
});
