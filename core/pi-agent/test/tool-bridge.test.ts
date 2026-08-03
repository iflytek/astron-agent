import { describe, expect, it } from "vitest";

import type { NormalizedToolDescriptor } from "../src/protocol.js";
import {
  createRemoteTools,
  createWaitTool,
  ToolBridge,
} from "../src/tool-bridge.js";

const statusTool: NormalizedToolDescriptor = {
  name: "query status",
  runtimeName: "query_status",
  description: "Query a job status",
  toolType: "mcp",
  parameters: {
    type: "object",
    properties: { job_id: { type: "string" } },
    required: ["job_id"],
  },
};

describe("ToolBridge", () => {
  it("correlates a remote Pi tool execution with one Python result", async () => {
    const sent: unknown[] = [];
    const bridge = new ToolBridge(async (message) => {
      sent.push(message);
    });
    const [tool] = createRemoteTools([statusTool], bridge);

    const execution = tool.execute("call-1", { job_id: "job-7" });
    await Promise.resolve();
    expect(sent).toEqual([
      {
        type: "tool_call",
        callId: "call-1",
        name: "query_status",
        arguments: { job_id: "job-7" },
      },
    ]);

    expect(
      bridge.handleToolResult({
        type: "tool_result",
        callId: "call-1",
        result: { code: 0, data: { state: "ready" } },
        isError: false,
      }),
    ).toBe(true);
    await expect(execution).resolves.toEqual({
      content: [
        { type: "text", text: '{"code":0,"data":{"state":"ready"}}' },
      ],
      details: { code: 0, data: { state: "ready" } },
    });
  });

  it("turns a Python tool error into a rejected Pi tool execution", async () => {
    const bridge = new ToolBridge(async () => undefined);
    const [tool] = createRemoteTools([statusTool], bridge);
    const execution = tool.execute("call-error", { job_id: "missing" });
    await Promise.resolve();

    bridge.handleToolResult({
      type: "tool_result",
      callId: "call-error",
      result: { code: 404, message: "job not found" },
      isError: true,
    });

    await expect(execution).rejects.toThrow("job not found");
  });

  it("rejects pending executions when the run is aborted", async () => {
    const bridge = new ToolBridge(async () => undefined);
    const [tool] = createRemoteTools([statusTool], bridge);
    const execution = tool.execute("call-abort", { job_id: "job-7" });
    await Promise.resolve();

    bridge.abort(new Error("client disconnected"));

    await expect(execution).rejects.toThrow("client disconnected");
  });
});

describe("wait tool", () => {
  it("performs a real delay and reports the waited duration", async () => {
    const tool = createWaitTool(1);
    const started = performance.now();

    const result = await tool.execute("wait-1", { seconds: 0.03 });

    expect(performance.now() - started).toBeGreaterThanOrEqual(20);
    expect(result).toEqual({
      content: [{ type: "text", text: "Waited 0.03 seconds." }],
      details: { seconds: 0.03 },
    });
  });

  it("is cancelled through AbortSignal", async () => {
    const tool = createWaitTool(5);
    const controller = new AbortController();
    const execution = tool.execute("wait-abort", { seconds: 1 }, controller.signal);
    controller.abort();

    await expect(execution).rejects.toThrow("aborted");
  });

  it("rejects waits outside the server-side bound", async () => {
    const tool = createWaitTool(2);

    await expect(tool.execute("wait-long", { seconds: 2.1 })).rejects.toThrow(
      "between 0 and 2 seconds",
    );
  });
});
