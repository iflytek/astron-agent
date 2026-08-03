import type { AddressInfo } from "node:net";

import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import type { RuntimeConfig } from "../src/config.js";
import type { StartMessage } from "../src/protocol.js";
import {
  createPiRuntimeServer,
  type PiRuntimeServer,
} from "../src/server.js";

const config: RuntimeConfig = {
  port: 8090,
  internalSecret: "bridge-secret",
  maxRunMs: 2_000,
  maxWaitSeconds: 120,
  repeatToolCallLimit: 8,
};

const start: StartMessage = {
  type: "start",
  runId: "server-run",
  model: {
    id: "fake-model",
    provider: "openai",
    baseUrl: "https://models.example/v1",
    apiKey: "do-not-log-this-key",
  },
  systemPrompt: "Be helpful.",
  messages: [],
  question: "Hello",
  tools: [],
};

let runningServer: PiRuntimeServer | undefined;

afterEach(async () => {
  await runningServer?.close();
  runningServer = undefined;
});

async function startServer(
  dependencies?: Parameters<typeof createPiRuntimeServer>[1],
) {
  runningServer = createPiRuntimeServer(config, dependencies);
  await runningServer.listen(0, "127.0.0.1");
  const address = runningServer.httpServer.address() as AddressInfo;
  return {
    httpUrl: `http://127.0.0.1:${address.port}`,
    wsUrl: `ws://127.0.0.1:${address.port}/internal/v1/runs`,
  };
}

function connect(url: string, secret = "bridge-secret"): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function nextMessage(socket: WebSocket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    socket.once("message", (data) => {
      try {
        resolve(JSON.parse(data.toString()));
      } catch (error) {
        reject(error);
      }
    });
    socket.once("error", reject);
  });
}

function nextMessages(socket: WebSocket, count: number): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const messages: unknown[] = [];
    socket.on("message", (data) => {
      try {
        messages.push(JSON.parse(data.toString()));
        if (messages.length === count) resolve(messages);
      } catch (error) {
        reject(error);
      }
    });
    socket.once("error", reject);
  });
}

describe("Pi runtime server", () => {
  it("serves a minimal health endpoint", async () => {
    const { httpUrl } = await startServer();

    const response = await fetch(`${httpUrl}/healthz`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("rejects a WebSocket upgrade with the wrong secret", async () => {
    const { wsUrl } = await startServer();

    const statusCode = await new Promise<number>((resolve, reject) => {
      const socket = new WebSocket(wsUrl, {
        headers: { Authorization: "Bearer wrong-secret" },
      });
      socket.once("unexpected-response", (_request, response) => {
        resolve(response.statusCode ?? 0);
      });
      socket.once("open", () => reject(new Error("unauthorized socket opened")));
      socket.once("error", () => undefined);
    });

    expect(statusCode).toBe(401);
  });

  it("requires start to be the first authenticated message", async () => {
    const { wsUrl } = await startServer();
    const socket = await connect(wsUrl);
    socket.send(
      JSON.stringify({
        type: "tool_result",
        callId: "not-started",
        result: {},
        isError: false,
      }),
    );

    await expect(nextMessage(socket)).resolves.toEqual({
      type: "error",
      code: "expected_start",
      message: "The first message must be start",
    });
  });

  it("aborts an active Pi run when the client disconnects", async () => {
    let abortedResolve: (() => void) | undefined;
    const aborted = new Promise<void>((resolve) => {
      abortedResolve = resolve;
    });
    const { wsUrl } = await startServer({
      runAgent: async (_start, _send, signal) => {
        await new Promise<void>((resolve) => {
          signal?.addEventListener(
            "abort",
            () => {
              abortedResolve?.();
              resolve();
            },
            { once: true },
          );
        });
      },
    });
    const socket = await connect(wsUrl);
    socket.send(JSON.stringify(start));
    socket.close();

    await expect(aborted).resolves.toBeUndefined();
  });

  it("streams run events and closes normally after done", async () => {
    const { wsUrl } = await startServer({
      runAgent: async (request, send) => {
        expect(request.runId).toBe("server-run");
        await send({ type: "content_delta", delta: "hello" });
        await send({ type: "done" });
      },
    });
    const socket = await connect(wsUrl);
    const messages = nextMessages(socket, 2);
    socket.send(JSON.stringify(start));

    await expect(messages).resolves.toEqual([
      { type: "content_delta", delta: "hello" },
      { type: "done" },
    ]);
  });

  it("redacts the model API key from runtime errors", async () => {
    const { wsUrl } = await startServer({
      runAgent: async () => {
        throw new Error(`provider rejected ${start.model.apiKey}`);
      },
    });
    const socket = await connect(wsUrl);
    socket.send(JSON.stringify(start));

    await expect(nextMessage(socket)).resolves.toEqual({
      type: "error",
      code: "runtime_error",
      message: "provider rejected [redacted]",
    });
  });
});
