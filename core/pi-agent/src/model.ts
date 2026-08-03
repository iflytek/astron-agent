import {
  createModels,
  createProvider,
  type Api,
  type Model,
} from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { googleGenerativeAIApi } from "@earendil-works/pi-ai/api/google-generative-ai.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import type { StreamFn } from "@earendil-works/pi-agent-core";

import type { ModelDescriptor } from "./protocol.js";

export interface ModelRuntime {
  model: Model<Api>;
  streamFn: StreamFn;
}

function normalizedProvider(provider: string): string {
  return provider.trim().toLowerCase() || "openai";
}

function normalizedBaseUrl(provider: string, baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (provider === "anthropic") {
    return trimmed.replace(/\/v1\/messages$/u, "");
  }
  if (provider === "google") {
    const withoutQuery = trimmed.replace(/[?#].*$/u, "");
    const withoutMethod = withoutQuery.replace(
      /\/models\/[^/]+:(?:stream)?generateContent$/u,
      "",
    );
    if (/\/v\d+(?:beta\d*)?$/u.test(withoutMethod)) {
      return withoutMethod;
    }
    return `${withoutMethod}/v1beta`;
  }
  return trimmed.replace(/\/(?:chat\/)?completions$/u, "");
}

function apiForProvider(provider: string): Api {
  if (provider === "anthropic") return "anthropic-messages";
  if (provider === "google") return "google-generative-ai";
  return "openai-completions";
}

function streamsForApi(api: Api) {
  if (api === "anthropic-messages") return anthropicMessagesApi();
  if (api === "google-generative-ai") return googleGenerativeAIApi();
  return openAICompletionsApi();
}

export function createModelRuntime(descriptor: ModelDescriptor): ModelRuntime {
  const provider = normalizedProvider(descriptor.provider);
  const api = apiForProvider(provider);
  const baseUrl = normalizedBaseUrl(provider, descriptor.baseUrl);
  const model: Model<Api> = {
    id: descriptor.id,
    name: descriptor.id,
    api,
    provider,
    baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8_192,
  };

  const models = createModels();
  models.setProvider(
    createProvider({
      id: provider,
      name: provider,
      baseUrl,
      auth: {
        apiKey: {
          name: `${provider} runtime key`,
          resolve: async () => ({ auth: { apiKey: descriptor.apiKey } }),
        },
      },
      models: [model],
      api: streamsForApi(api),
    }),
  );
  const registeredModel = models.getModel(provider, descriptor.id);
  if (!registeredModel) {
    throw new Error(`Unable to register model ${descriptor.id}`);
  }
  return {
    model: registeredModel,
    streamFn: models.streamSimple.bind(models),
  };
}
