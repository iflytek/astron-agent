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
    ["anthropic", "anthropic-messages"],
    ["google", "google-generative-ai"],
  ] as const)("maps %s to its native Pi API", (provider, api) => {
    const runtime = createModelRuntime({
      id: "native-model",
      provider,
      baseUrl: "https://native.example/v1",
      apiKey: "model-key",
    });

    expect(runtime.model.api).toBe(api);
    expect(runtime.model.provider).toBe(provider);
  });
});
