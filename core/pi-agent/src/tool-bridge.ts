import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { Type, type TSchema } from "typebox";

import type {
  NormalizedToolDescriptor,
  SendServerMessage,
  ToolResultMessage,
} from "./protocol.js";

type PendingTool = {
  resolve: (result: AgentToolResult<unknown>) => void;
  reject: (error: Error) => void;
  cleanup: () => void;
};

function resultText(result: unknown): string {
  if (typeof result === "string") return result;
  return JSON.stringify(result) ?? "null";
}

function resultError(result: unknown): Error {
  if (
    typeof result === "object" &&
    result !== null &&
    "message" in result &&
    typeof result.message === "string"
  ) {
    return new Error(result.message);
  }
  return new Error(resultText(result));
}

export class ToolBridge {
  private readonly pending = new Map<string, PendingTool>();
  private readonly turnIds = new Map<string, string>();

  constructor(private readonly send: SendServerMessage) {}

  bindTurn(callId: string, turnId: string): void {
    this.turnIds.set(callId, turnId);
  }

  execute(
    callId: string,
    name: string,
    arguments_: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<AgentToolResult<unknown>> {
    if (this.pending.has(callId)) {
      return Promise.reject(new Error(`Duplicate tool call id: ${callId}`));
    }
    if (signal?.aborted) {
      return Promise.reject(new Error("tool execution aborted"));
    }
    const turnId = this.turnIds.get(callId);
    if (!turnId) {
      return Promise.reject(new Error(`Missing turn id for tool call: ${callId}`));
    }

    return new Promise<AgentToolResult<unknown>>((resolve, reject) => {
      const onAbort = () => {
        this.rejectPending(callId, new Error("tool execution aborted"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.pending.set(callId, {
        resolve,
        reject,
        cleanup: () => signal?.removeEventListener("abort", onAbort),
      });

      void Promise.resolve(
        this.send({
          type: "tool_call",
          callId,
          turnId,
          name,
          arguments: arguments_,
        }),
      ).catch((error: unknown) => {
        this.rejectPending(
          callId,
          error instanceof Error ? error : new Error(String(error)),
        );
      });
    });
  }

  handleToolResult(message: ToolResultMessage): boolean {
    const pending = this.pending.get(message.callId);
    if (!pending) return false;
    this.pending.delete(message.callId);
    this.turnIds.delete(message.callId);
    pending.cleanup();
    if (message.isError) {
      pending.reject(resultError(message.result));
    } else {
      pending.resolve({
        content: [{ type: "text", text: resultText(message.result) }],
        details: message.result,
      });
    }
    return true;
  }

  abort(error: Error = new Error("Pi tool bridge aborted")): void {
    for (const callId of [...this.pending.keys()]) {
      this.rejectPending(callId, error);
    }
  }

  private rejectPending(callId: string, error: Error): void {
    const pending = this.pending.get(callId);
    if (!pending) return;
    this.pending.delete(callId);
    this.turnIds.delete(callId);
    pending.cleanup();
    pending.reject(error);
  }
}

export function createRemoteTools(
  descriptors: readonly NormalizedToolDescriptor[],
  bridge: ToolBridge,
): AgentTool[] {
  return descriptors.map(
    (descriptor): AgentTool => ({
      name: descriptor.runtimeName,
      label: descriptor.name,
      description: descriptor.description,
      parameters: descriptor.parameters as TSchema,
      executionMode: "sequential",
      execute: async (callId, parameters, signal) =>
        bridge.execute(
          callId,
          descriptor.runtimeName,
          parameters as Record<string, unknown>,
          signal,
        ),
    }),
  );
}

async function cancellableDelay(milliseconds: number, signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("wait aborted");
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error("wait aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

export function createWaitTool(maxWaitSeconds: number): AgentTool {
  const parameters = Type.Object({
    seconds: Type.Number({ minimum: 0, maximum: maxWaitSeconds }),
  });
  return {
    name: "wait",
    label: "Wait",
    description:
      "Pause for the requested number of seconds before checking an asynchronous operation again.",
    parameters,
    executionMode: "sequential",
    execute: async (_callId, input, signal) => {
      const { seconds } = input as { seconds: number };
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > maxWaitSeconds) {
        throw new Error(`seconds must be between 0 and ${maxWaitSeconds} seconds`);
      }
      await cancellableDelay(seconds * 1_000, signal);
      return {
        content: [{ type: "text", text: `Waited ${seconds} seconds.` }],
        details: { seconds },
      };
    },
  };
}
