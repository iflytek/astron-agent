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
import {
  normalizeToolDescriptors,
  type SendServerMessage,
  type StartMessage,
} from "./protocol.js";
import { ConsecutiveToolCallGuard } from "./safety.js";
import {
  createRemoteTools,
  createWaitTool,
  ToolBridge,
} from "./tool-bridge.js";

export interface RunAgentOptions {
  modelRuntime?: ModelRuntime;
  toolBridge?: ToolBridge;
  maxWaitSeconds?: number;
  repeatToolCallLimit?: number;
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
  const toolBridge = options.toolBridge ?? new ToolBridge(send);
  const guard = new ConsecutiveToolCallGuard(
    options.repeatToolCallLimit ?? 8,
  );
  const context: AgentContext = {
    systemPrompt: start.systemPrompt,
    messages: historyMessages(start, runtime),
    tools: [
      ...createRemoteTools(normalizeToolDescriptors(start.tools), toolBridge),
      createWaitTool(options.maxWaitSeconds ?? 120),
    ],
  };
  const stream = agentLoop(
    [currentQuestion(start.question)],
    context,
    {
      model: runtime.model,
      apiKey: start.model.apiKey,
      convertToLlm,
      toolExecution: "sequential",
      beforeToolCall: guard.beforeToolCall,
    },
    signal,
    runtime.streamFn as StreamFn,
  );

  let failed = false;
  const toolArguments = new Map<string, Record<string, unknown>>();
  try {
    for await (const event of stream) {
      if (event.type === "message_update") {
        const update = event.assistantMessageEvent;
        if (update.type === "text_delta") {
          await send({ type: "content_delta", delta: update.delta });
        } else if (update.type === "thinking_delta") {
          await send({ type: "reasoning_delta", delta: update.delta });
        }
      } else if (event.type === "tool_execution_start") {
        const arguments_ = event.args as Record<string, unknown>;
        toolArguments.set(event.toolCallId, arguments_);
        if (event.toolName === "wait") {
          await send({
            type: "tool_call",
            callId: event.toolCallId,
            name: event.toolName,
            arguments: arguments_,
          });
        }
      } else if (event.type === "tool_execution_update") {
        await send({
          type: "tool_progress",
          callId: event.toolCallId,
          name: event.toolName,
          result: event.partialResult,
        });
      } else if (event.type === "tool_execution_end") {
        const result = event.result as { details?: unknown };
        await send({
          type: "tool_completed",
          callId: event.toolCallId,
          name: event.toolName,
          arguments: toolArguments.get(event.toolCallId) ?? {},
          result: result.details ?? event.result,
          isError: event.isError,
        });
        toolArguments.delete(event.toolCallId);
      } else if (event.type === "turn_end" && event.message.role === "assistant") {
        const usage = event.message.usage;
        await send({
          type: "usage",
          inputTokens: usage.input,
          outputTokens: usage.output,
          totalTokens: usage.totalTokens,
        });
        if (
          event.message.stopReason === "error" ||
          event.message.stopReason === "aborted"
        ) {
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
  } finally {
    toolBridge.abort(new Error("Pi agent run ended"));
  }
  if (!failed) {
    await send({ type: "done" });
  }
}
