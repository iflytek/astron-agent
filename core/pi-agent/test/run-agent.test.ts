import {
  EventStream,
  type AssistantMessage,
  type AssistantMessageEvent,
  type Context,
  type Model,
} from "@earendil-works/pi-ai";
import { describe, expect, it, vi } from "vitest";

import type { ServerMessage, StartMessage } from "../src/protocol.js";
import { runPiAgent } from "../src/run-agent.js";
import { ToolBridge } from "../src/tool-bridge.js";

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

  it("classifies tool-turn text as reasoning and terminal text as content", async () => {
    const transcriptStart: StartMessage = {
      ...start,
      tools: [
        {
          name: "lookup",
          description: "Look up one value",
          toolType: "mcp",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
        },
      ],
    };
    const assistantTurns: AssistantMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "I will inspect the source." },
          {
            type: "toolCall",
            id: "lookup-1",
            name: "lookup",
            arguments: { query: "status" },
          },
        ],
        api: "openai-completions",
        provider: "openai",
        model: "fake-model",
        usage: usage(),
        stopReason: "toolUse",
        timestamp: 1,
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "The status is ready." }],
        api: "openai-completions",
        provider: "openai",
        model: "fake-model",
        usage: usage(),
        stopReason: "stop",
        timestamp: 2,
      },
    ];
    let turnIndex = 0;
    const streamFn = () => {
      const message = assistantTurns[turnIndex++];
      if (!message) throw new Error("unexpected extra model turn");
      const stream = new MockAssistantStream();
      queueMicrotask(() => {
        const initial: AssistantMessage = {
          ...message,
          content: [],
          stopReason: "pending",
        };
        const text = message.content.find((block) => block.type === "text");
        stream.push({ type: "start", partial: initial });
        if (text?.type === "text") {
          stream.push({
            type: "text_delta",
            contentIndex: 0,
            delta: text.text,
            partial: { ...initial, content: [text] },
          });
        }
        stream.push({
          type: "done",
          reason: message.stopReason === "stop" ? "stop" : "toolUse",
          message,
        });
      });
      return stream;
    };

    const sent: ServerMessage[] = [];
    let bridge: ToolBridge;
    const send = async (message: ServerMessage) => {
      sent.push(message);
      if (message.type === "tool_call") {
        bridge.handleToolResult({
          type: "tool_result",
          callId: message.callId,
          result: { status: "ready" },
          isError: false,
        });
      }
    };
    bridge = new ToolBridge(send);

    await runPiAgent(transcriptStart, send, undefined, {
      modelRuntime: { model: model(), streamFn },
      toolBridge: bridge,
    });

    expect(
      sent.filter(
        (message) =>
          message.type === "reasoning_delta" || message.type === "content_delta",
      ),
    ).toEqual([
      { type: "reasoning_delta", delta: "I will inspect the source." },
      { type: "content_delta", delta: "The status is ready." },
    ]);
  });

  it("retains remote create state across a local wait before polling", async () => {
    vi.useFakeTimers();
    try {
      const transcriptStart: StartMessage = {
        ...start,
        tools: [
          {
            name: "create_task",
            description: "Create one asynchronous task",
            toolType: "mcp",
            parameters: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
            },
          },
          {
            name: "get_progress",
            description: "Read asynchronous task progress",
            toolType: "mcp",
            parameters: {
              type: "object",
              properties: { sid: { type: "string" } },
              required: ["sid"],
            },
          },
        ],
      };
      const modelContexts: Context[] = [];
      const assistantTurns: AssistantMessage[] = [
        {
          role: "assistant",
          content: [
            {
              type: "toolCall",
              id: "create-1",
              name: "create_task",
              arguments: { title: "Quarterly update" },
            },
          ],
          api: "openai-completions",
          provider: "openai",
          model: "fake-model",
          usage: usage(),
          stopReason: "toolUse",
          timestamp: 1,
        },
        {
          role: "assistant",
          content: [
            {
              type: "toolCall",
              id: "wait-1",
              name: "wait",
              arguments: { seconds: 1 },
            },
          ],
          api: "openai-completions",
          provider: "openai",
          model: "fake-model",
          usage: usage(),
          stopReason: "toolUse",
          timestamp: 2,
        },
        {
          role: "assistant",
          content: [
            {
              type: "toolCall",
              id: "progress-1",
              name: "get_progress",
              arguments: { sid: "sid-1" },
            },
          ],
          api: "openai-completions",
          provider: "openai",
          model: "fake-model",
          usage: usage(),
          stopReason: "toolUse",
          timestamp: 3,
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "complete" }],
          api: "openai-completions",
          provider: "openai",
          model: "fake-model",
          usage: usage(),
          stopReason: "stop",
          timestamp: 4,
        },
      ];
      const streamFn = (_model: Model<any>, context: Context) => {
        modelContexts.push({
          ...context,
          messages: structuredClone(context.messages),
        });
        const message = assistantTurns[modelContexts.length - 1];
        if (!message) throw new Error("unexpected extra model turn");
        const stream = new MockAssistantStream();
        queueMicrotask(() => {
          stream.push({ type: "start", partial: message });
          stream.push({
            type: "done",
            reason: message.stopReason === "stop" ? "stop" : "toolUse",
            message,
          });
        });
        return stream;
      };

      const sent: ServerMessage[] = [];
      let bridge: ToolBridge;
      const send = async (message: ServerMessage) => {
        sent.push(message);
        if (message.type === "tool_call" && message.name === "create_task") {
          bridge.handleToolResult({
            type: "tool_result",
            callId: message.callId,
            result: { sid: "sid-1" },
            isError: false,
          });
        } else if (
          message.type === "tool_call" &&
          message.name === "get_progress"
        ) {
          bridge.handleToolResult({
            type: "tool_result",
            callId: message.callId,
            result: { status: "complete" },
            isError: false,
          });
        }
      };
      bridge = new ToolBridge(send);

      const run = runPiAgent(transcriptStart, send, undefined, {
        modelRuntime: { model: model(), streamFn },
        toolBridge: bridge,
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(1_000);
      await run;

      const toolCalls = sent.filter(
        (message): message is Extract<ServerMessage, { type: "tool_call" }> =>
          message.type === "tool_call",
      );
      expect(toolCalls.filter((message) => message.name === "create_task")).toHaveLength(
        1,
      );
      const progressCalls = toolCalls.filter(
        (message) => message.name === "get_progress",
      );
      expect(progressCalls).toEqual([
        expect.objectContaining({ arguments: { sid: "sid-1" } }),
      ]);
      expect(modelContexts[1].messages).toContainEqual(
        expect.objectContaining({
          role: "toolResult",
          toolCallId: "create-1",
          details: { sid: "sid-1" },
        }),
      );
      expect(modelContexts[2].messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "toolResult",
            toolCallId: "create-1",
            details: { sid: "sid-1" },
          }),
          expect.objectContaining({
            role: "toolResult",
            toolCallId: "wait-1",
            details: { seconds: 1 },
          }),
        ]),
      );
      expect(
        sent.filter(
          (message) => message.type === "done",
        ),
      ).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
