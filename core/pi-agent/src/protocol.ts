export type JsonObjectSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: readonly string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
};

export interface ModelDescriptor {
  id: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolDescriptor {
  name: string;
  description: string;
  parameters: JsonObjectSchema;
  toolType: string;
}

export interface NormalizedToolDescriptor extends ToolDescriptor {
  runtimeName: string;
}

export interface StartMessage {
  type: "start";
  runId: string;
  model: ModelDescriptor;
  systemPrompt: string;
  messages: HistoryMessage[];
  question: string;
  tools: ToolDescriptor[];
}

export interface ToolResultMessage {
  type: "tool_result";
  callId: string;
  result: unknown;
  isError: boolean;
}

export type ClientMessage = StartMessage | ToolResultMessage;

export type ServerMessage =
  | { type: "content_delta"; delta: string }
  | { type: "reasoning_delta"; delta: string }
  | {
      type: "tool_call";
      callId: string;
      name: string;
      arguments: Record<string, unknown>;
    }
  | {
      type: "tool_progress";
      callId: string;
      name: string;
      result: unknown;
    }
  | {
      type: "tool_completed";
      callId: string;
      name: string;
      arguments: Record<string, unknown>;
      result: unknown;
      isError: boolean;
    }
  | { type: "usage"; inputTokens: number; outputTokens: number; totalTokens: number }
  | { type: "error"; code: string; message: string }
  | { type: "done" };

export type SendServerMessage = (
  message: ServerMessage,
) => Promise<void> | void;

export class ProtocolError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProtocolError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  code: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ProtocolError(code, `${key} must be a non-empty string`);
  }
  return value;
}

function parseModel(value: unknown): ModelDescriptor {
  if (!isRecord(value)) {
    throw new ProtocolError("invalid_start", "model must be an object");
  }
  return {
    id: requireString(value, "id", "invalid_start"),
    provider: requireString(value, "provider", "invalid_start"),
    baseUrl: requireString(value, "baseUrl", "invalid_start"),
    apiKey: requireString(value, "apiKey", "invalid_start"),
  };
}

function parseMessages(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) {
    throw new ProtocolError("invalid_start", "messages must be an array");
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new ProtocolError("invalid_start", "history message must be an object");
    }
    if (item.role !== "user" && item.role !== "assistant") {
      throw new ProtocolError("invalid_start", "history role must be user or assistant");
    }
    if (typeof item.content !== "string") {
      throw new ProtocolError("invalid_start", "history content must be a string");
    }
    return { role: item.role, content: item.content };
  });
}

function parseParameters(value: unknown): JsonObjectSchema {
  if (!isRecord(value) || value.type !== "object" || !isRecord(value.properties)) {
    throw new ProtocolError(
      "invalid_start",
      "tool parameters must be an object JSON Schema",
    );
  }
  if (
    value.required !== undefined &&
    (!Array.isArray(value.required) ||
      !value.required.every((item) => typeof item === "string"))
  ) {
    throw new ProtocolError("invalid_start", "tool required must be a string array");
  }
  return value as JsonObjectSchema;
}

function parseTools(value: unknown): ToolDescriptor[] {
  if (!Array.isArray(value)) {
    throw new ProtocolError("invalid_start", "tools must be an array");
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new ProtocolError("invalid_start", "tool must be an object");
    }
    return {
      name: requireString(item, "name", "invalid_start"),
      description:
        typeof item.description === "string" ? item.description : "",
      parameters: parseParameters(item.parameters),
      toolType: requireString(item, "toolType", "invalid_start"),
    };
  });
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  code: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new ProtocolError(code, `Unknown field: ${key}`);
    }
  }
}

function parseStart(value: Record<string, unknown>): StartMessage {
  rejectUnknownFields(
    value,
    new Set([
      "type",
      "runId",
      "model",
      "systemPrompt",
      "messages",
      "question",
      "tools",
    ]),
    "invalid_start",
  );
  return {
    type: "start",
    runId: requireString(value, "runId", "invalid_start"),
    model: parseModel(value.model),
    systemPrompt:
      typeof value.systemPrompt === "string" ? value.systemPrompt : "",
    messages: parseMessages(value.messages),
    question: requireString(value, "question", "invalid_start"),
    tools: parseTools(value.tools),
  };
}

function parseToolResult(value: Record<string, unknown>): ToolResultMessage {
  rejectUnknownFields(
    value,
    new Set(["type", "callId", "result", "isError"]),
    "invalid_tool_result",
  );
  if (typeof value.isError !== "boolean") {
    throw new ProtocolError("invalid_tool_result", "isError must be a boolean");
  }
  return {
    type: "tool_result",
    callId: requireString(value, "callId", "invalid_tool_result"),
    result: value.result,
    isError: value.isError,
  };
}

export function parseClientMessage(value: unknown): ClientMessage {
  if (!isRecord(value)) {
    throw new ProtocolError("invalid_message", "message must be an object");
  }
  if (value.type === "start") {
    return parseStart(value);
  }
  if (value.type === "tool_result") {
    return parseToolResult(value);
  }
  throw new ProtocolError("invalid_message", "unsupported message type");
}

function normalizeToolName(name: string): string {
  const normalized = name
    .trim()
    .replace(/[^A-Za-z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "") || "tool";
  return /^[A-Za-z_]/u.test(normalized) ? normalized : `tool_${normalized}`;
}

export function normalizeToolDescriptors(
  tools: readonly ToolDescriptor[],
): NormalizedToolDescriptor[] {
  const counts = new Map<string, number>();
  return tools.map((tool) => {
    const baseName = normalizeToolName(tool.name);
    const count = (counts.get(baseName) ?? 0) + 1;
    counts.set(baseName, count);
    return {
      ...tool,
      runtimeName: count === 1 ? baseName : `${baseName}__${count}`,
    };
  });
}
