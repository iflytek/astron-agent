import {
  agentLoop,
  type AgentContext,
  type AgentMessage,
  type StreamFn,
} from "@earendil-works/pi-agent-core";
import type {
  AssistantMessage,
  Message,
  UserMessage,
} from "@earendil-works/pi-ai";

import { createModelRuntime, type ModelRuntime } from "./model.js";
import type { ServerMessage, StartMessage } from "./protocol.js";

export type SendServerMessage = (message: ServerMessage) => Promise<void> | void;

export interface RunAgentOptions {
  modelRuntime?: ModelRuntime;
}

function emptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function historyMessages(
  start: StartMessage,
  runtime: ModelRuntime,
): AgentMessage[] {
  return start.messages.map((message): AgentMessage => {
    if (message.role === "user") {
      return {
        role: "user",
        content: message.content,
        timestamp: Date.now(),
      } satisfies UserMessage;
    }
    return {
      role: "assistant",
      content: [{ type: "text", text: message.content }],
      api: runtime.model.api,
      provider: runtime.model.provider,
      model: runtime.model.id,
      usage: emptyUsage(),
      stopReason: "stop",
      timestamp: Date.now(),
    } satisfies AssistantMessage;
  });
}

function currentQuestion(question: string): UserMessage {
  return { role: "user", content: question, timestamp: Date.now() };
}

function convertToLlm(messages: AgentMessage[]): Message[] {
  return messages.filter(
    (message): message is Message =>
      message.role === "user" ||
      message.role === "assistant" ||
      message.role === "toolResult",
  );
}

export async function runPiAgent(
  start: StartMessage,
  send: SendServerMessage,
  signal?: AbortSignal,
  options: RunAgentOptions = {},
): Promise<void> {
  const runtime = options.modelRuntime ?? createModelRuntime(start.model);
  const context: AgentContext = {
    systemPrompt: start.systemPrompt,
    messages: historyMessages(start, runtime),
    tools: [],
  };
  const stream = agentLoop(
    [currentQuestion(start.question)],
    context,
    {
      model: runtime.model,
      apiKey: start.model.apiKey,
      convertToLlm,
      toolExecution: "sequential",
    },
    signal,
    runtime.streamFn as StreamFn,
  );

  let failed = false;
  for await (const event of stream) {
    if (event.type === "message_update") {
      const update = event.assistantMessageEvent;
      if (update.type === "text_delta") {
        await send({ type: "content_delta", delta: update.delta });
      } else if (update.type === "thinking_delta") {
        await send({ type: "reasoning_delta", delta: update.delta });
      }
    } else if (event.type === "turn_end" && event.message.role === "assistant") {
      const usage = event.message.usage;
      await send({
        type: "usage",
        inputTokens: usage.input,
        outputTokens: usage.output,
        totalTokens: usage.totalTokens,
      });
      if (event.message.stopReason === "error" || event.message.stopReason === "aborted") {
        failed = true;
        await send({
          type: "error",
          code: event.message.stopReason,
          message: event.message.errorMessage ?? "Pi model run failed",
        });
      }
    }
  }
  await stream.result();
  if (!failed) {
    await send({ type: "done" });
  }
}
