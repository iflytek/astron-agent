import { describe, expect, it } from "vitest";

import { createModelRuntime } from "../src/model.js";

describe("createModelRuntime", () => {
  it("maps OpenAI-compatible providers to Pi completions and normalizes the endpoint", () => {
    const runtime = createModelRuntime({
      id: "qwen-max",
      provider: "qwen",
      baseUrl: "https://gateway.example/v1/chat/completions",
      apiKey: "model-key",
    });

    expect(runtime.model).toMatchObject({
      id: "qwen-max",
      provider: "qwen",
      api: "openai-completions",
      baseUrl: "https://gateway.example/v1",
      reasoning: false,
    });
  });

  it.each([
    [
      "anthropic",
      "anthropic-messages",
      "claude-sonnet-4",
      "https://api.anthropic.com/v1/messages",
      "https://api.anthropic.com",
    ],
    [
      "google",
      "google-generative-ai",
      "gemini-2.5-flash",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1beta",
    ],
  ] as const)(
    "maps %s to its native Pi API and normalizes the console endpoint",
    (provider, api, id, baseUrl, expectedBaseUrl) => {
      const runtime = createModelRuntime({
        id,
        provider,
        baseUrl,
        apiKey: "model-key",
      });

      expect(runtime.model.api).toBe(api);
      expect(runtime.model.provider).toBe(provider);
      expect(runtime.model.baseUrl).toBe(expectedBaseUrl);
    },
  );
});
