import { describe, expect, it } from "vitest";

import { loadRuntimeConfig } from "../src/config.js";
import {
  normalizeToolDescriptors,
  parseClientMessage,
  ProtocolError,
} from "../src/protocol.js";

const validStart = {
  type: "start",
  runId: "run-1",
  model: {
    id: "gpt-test",
    provider: "openai",
    baseUrl: "https://models.example/v1",
    apiKey: "secret-model-key",
  },
  systemPrompt: "Use tools when needed.",
  messages: [{ role: "assistant", content: "Earlier answer" }],
  question: "What is the status?",
  tools: [
    {
      name: "query-status",
      description: "Query a job status",
      parameters: {
        type: "object",
        properties: { job_id: { type: "string" } },
        required: ["job_id"],
      },
      toolType: "mcp",
    },
  ],
} as const;

describe("parseClientMessage", () => {
  it("accepts a complete start request with native JSON Schema tools", () => {
    expect(parseClientMessage(validStart)).toEqual(validStart);
  });

  it("rejects maxLoopCount instead of turning it into a Pi runtime limit", () => {
    expect(() =>
      parseClientMessage({ ...validStart, maxLoopCount: 100 }),
    ).toThrowError(new ProtocolError("invalid_start", "Unknown field: maxLoopCount"));
  });

  it("rejects a tool without an object JSON Schema", () => {
    expect(() =>
      parseClientMessage({
        ...validStart,
        tools: [{ ...validStart.tools[0], parameters: { type: "string" } }],
      }),
    ).toThrowError(ProtocolError);
  });

  it("accepts a correlated tool result", () => {
    expect(
      parseClientMessage({
        type: "tool_result",
        callId: "call-9",
        result: { code: 0, data: { state: "ready" } },
        isError: false,
      }),
    ).toEqual({
      type: "tool_result",
      callId: "call-9",
      result: { code: 0, data: { state: "ready" } },
      isError: false,
    });
  });
});

describe("normalizeToolDescriptors", () => {
  it("normalizes invalid characters and gives duplicates stable suffixes", () => {
    expect(
      normalizeToolDescriptors([
        validStart.tools[0],
        { ...validStart.tools[0], name: "query status" },
        { ...validStart.tools[0], name: "query-status" },
      ]).map((tool) => tool.runtimeName),
    ).toEqual(["query_status", "query_status__2", "query_status__3"]);
  });
});

describe("loadRuntimeConfig", () => {
  it("uses server-only safety defaults", () => {
    expect(loadRuntimeConfig({ PI_AGENT_INTERNAL_SECRET: "bridge-secret" })).toEqual({
      port: 8090,
      internalSecret: "bridge-secret",
      maxRunMs: 1_500_000,
      maxWaitSeconds: 120,
      repeatToolCallLimit: 8,
    });
  });

  it("requires an internal secret", () => {
    expect(() => loadRuntimeConfig({})).toThrow("PI_AGENT_INTERNAL_SECRET is required");
  });

  it("rejects the published deployment placeholder outside explicit development", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        PI_AGENT_INTERNAL_SECRET: "change-me-in-production",
      }),
    ).toThrow("PI_AGENT_INTERNAL_SECRET must not use the published placeholder");
  });

  it("allows the placeholder only behind the explicit local-development gate", () => {
    expect(
      loadRuntimeConfig({
        NODE_ENV: "development",
        PI_AGENT_ALLOW_INSECURE_DEVELOPMENT_SECRET: "true",
        PI_AGENT_INTERNAL_SECRET: "change-me-in-production",
      }).internalSecret,
    ).toBe("change-me-in-production");
  });
});
