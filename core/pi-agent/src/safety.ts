import type {
  BeforeToolCallContext,
  BeforeToolCallResult,
} from "@earendil-works/pi-agent-core";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export class ConsecutiveToolCallGuard {
  private previousKey: string | undefined;
  private consecutiveCount = 0;

  constructor(private readonly limit: number) {}

  readonly beforeToolCall = async (
    context: BeforeToolCallContext,
  ): Promise<BeforeToolCallResult | undefined> => {
    const name = context.toolCall.name;
    if (name === "wait") {
      this.previousKey = undefined;
      this.consecutiveCount = 0;
      return undefined;
    }

    const key = `${name}:${stableJson(context.args)}`;
    if (key === this.previousKey) {
      this.consecutiveCount += 1;
    } else {
      this.previousKey = key;
      this.consecutiveCount = 1;
    }

    if (this.consecutiveCount <= this.limit) {
      return undefined;
    }
    return {
      block: true,
      reason: `Blocked repeated tool call "${name}" after ${this.limit} identical consecutive executions. Wait or change the request before retrying.`,
    };
  };
}
