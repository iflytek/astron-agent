import type { BeforeToolCallContext } from "@earendil-works/pi-agent-core";
import { describe, expect, it } from "vitest";

import { ConsecutiveToolCallGuard } from "../src/safety.js";

function call(name: string, args: unknown): BeforeToolCallContext {
  return {
    toolCall: { type: "toolCall", id: `call-${name}`, name, arguments: args },
    args,
  } as BeforeToolCallContext;
}

describe("ConsecutiveToolCallGuard", () => {
  it("blocks only after the configured number of identical consecutive calls", async () => {
    const guard = new ConsecutiveToolCallGuard(8);
    const allowed = [];
    for (let index = 0; index < 8; index += 1) {
      allowed.push(await guard.beforeToolCall(call("query_status", { job_id: "7" })));
    }

    expect(allowed).toEqual(new Array(8).fill(undefined));
    await expect(
      guard.beforeToolCall(call("query_status", { job_id: "7" })),
    ).resolves.toEqual({
      block: true,
      reason:
        'Blocked repeated tool call "query_status" after 8 identical consecutive executions. Wait or change the request before retrying.',
    });
  });

  it("treats reordered object keys as the same arguments", async () => {
    const guard = new ConsecutiveToolCallGuard(1);
    await guard.beforeToolCall(call("query", { a: 1, b: 2 }));

    await expect(
      guard.beforeToolCall(call("query", { b: 2, a: 1 })),
    ).resolves.toMatchObject({ block: true });
  });

  it("resets the fuse when Pi calls wait between polls", async () => {
    const guard = new ConsecutiveToolCallGuard(1);
    await guard.beforeToolCall(call("query_status", { job_id: "7" }));
    await guard.beforeToolCall(call("wait", { seconds: 30 }));

    await expect(
      guard.beforeToolCall(call("query_status", { job_id: "7" })),
    ).resolves.toBeUndefined();
  });
});
