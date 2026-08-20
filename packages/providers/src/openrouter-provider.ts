import { OpenAICompatibleProvider } from "./openai-compatible-provider";
import type { ProviderName } from "@nusantara/core";

interface OpenRouterConfig {
  apiKey: string;
  model?: string;
}

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(config: OpenRouterConfig) {
    super({
      name: "openrouter" as ProviderName,
      apiKey: config.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      model: config.model ?? "openai/tts-1",
      defaultVoice: "alloy",
      supportsInstructions: false,
      supportsSpeed: true,
    });
  }
}
