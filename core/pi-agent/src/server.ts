import { createServer, type Server } from "node:http";
import { timingSafeEqual } from "node:crypto";

import WebSocket, { WebSocketServer } from "ws";

import type { RuntimeConfig } from "./config.js";
import {
  parseClientMessage,
  ProtocolError,
  type SendServerMessage,
  type ServerMessage,
  type StartMessage,
} from "./protocol.js";
import { runPiAgent } from "./run-agent.js";
import { ToolBridge } from "./tool-bridge.js";

export interface PiRuntimeServerDependencies {
  runAgent?: typeof runPiAgent;
}

export interface PiRuntimeServer {
  httpServer: Server;
  listen(port: number, host: string): Promise<void>;
  close(): Promise<void>;
}

function authorized(header: string | undefined, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function rejectUpgrade(
  socket: import("node:stream").Duplex,
  status: number,
  reason: string,
): void {
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}

function redactedError(error: unknown, start?: StartMessage): string {
  const message = error instanceof Error ? error.message : String(error);
  const apiKey = start?.model.apiKey;
  return apiKey ? message.replaceAll(apiKey, "[redacted]") : message;
}

function handleSession(
  socket: WebSocket,
  config: RuntimeConfig,
  runAgent: typeof runPiAgent,
): void {
  const send: SendServerMessage = async (message) => {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error("Pi runtime client disconnected");
    }
    await new Promise<void>((resolve, reject) => {
      socket.send(JSON.stringify(message), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  };
  const bridge = new ToolBridge(send);
  let start: StartMessage | undefined;
  let controller: AbortController | undefined;
  let deadline: NodeJS.Timeout | undefined;

  const sendError = async (
    code: string,
    message: string,
    closeCode = 1011,
  ) => {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        await send({ type: "error", code, message });
      } finally {
        socket.close(closeCode, code.slice(0, 120));
      }
    }
  };

  const startRun = (request: StartMessage) => {
    start = request;
    controller = new AbortController();
    deadline = setTimeout(() => {
      controller?.abort(new Error("Pi agent run deadline exceeded"));
    }, config.maxRunMs);

    void runAgent(request, send, controller.signal, {
      toolBridge: bridge,
      maxWaitSeconds: config.maxWaitSeconds,
      repeatToolCallLimit: config.repeatToolCallLimit,
    })
      .catch(async (error: unknown) => {
        await sendError("runtime_error", redactedError(error, start));
      })
      .finally(() => {
        if (deadline) clearTimeout(deadline);
        bridge.abort(new Error("Pi agent run ended"));
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, "done");
        }
      });
  };

  socket.on("message", (data, isBinary) => {
    if (isBinary) {
      void sendError("invalid_message", "Binary messages are not supported", 1008);
      return;
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(data.toString());
    } catch {
      void sendError("invalid_json", "Message must be valid JSON", 1008);
      return;
    }

    let message;
    try {
      message = parseClientMessage(parsedJson);
    } catch (error) {
      const code = error instanceof ProtocolError ? error.code : "invalid_message";
      void sendError(code, redactedError(error, start), 1008);
      return;
    }

    if (!start) {
      if (message.type !== "start") {
        void sendError(
          "expected_start",
          "The first message must be start",
          1008,
        );
        return;
      }
      startRun(message);
      return;
    }

    if (message.type !== "tool_result") {
      void sendError("unexpected_message", "Run is already started", 1008);
      return;
    }
    if (!bridge.handleToolResult(message)) {
      void send({
        type: "error",
        code: "unknown_tool_call",
        message: `No pending tool call for ${message.callId}`,
      } satisfies ServerMessage);
    }
  });

  socket.once("close", () => {
    if (deadline) clearTimeout(deadline);
    controller?.abort(new Error("Pi runtime client disconnected"));
    bridge.abort(new Error("Pi runtime client disconnected"));
  });
}

export function createPiRuntimeServer(
  config: RuntimeConfig,
  dependencies: PiRuntimeServerDependencies = {},
): PiRuntimeServer {
  const httpServer = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/healthz") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const webSocketServer = new WebSocketServer({ noServer: true });
  webSocketServer.on("connection", (socket) => {
    handleSession(socket, config, dependencies.runAgent ?? runPiAgent);
  });
  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url !== "/internal/v1/runs") {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }
    if (!authorized(request.headers.authorization, config.internalSecret)) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, (client) => {
      webSocketServer.emit("connection", client, request);
    });
  });

  return {
    httpServer,
    listen: async (port, host) => {
      await new Promise<void>((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, host, () => {
          httpServer.off("error", reject);
          resolve();
        });
      });
    },
    close: async () => {
      for (const client of webSocketServer.clients) {
        client.terminate();
      }
      webSocketServer.close();
      if (!httpServer.listening) return;
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}
