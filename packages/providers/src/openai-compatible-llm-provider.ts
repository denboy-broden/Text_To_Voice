import type {
  LLMRequest,
  LLMResponse,
  ProviderName,
} from "@nusantara/core";
import { BaseLLMProvider } from "./base-llm-provider";

interface OpenAICompatibleLLMConfig {
  name?: string;
  apiKey: string;
  baseURL: string;
  model?: string;
}

export class OpenAICompatibleLLMProvider extends BaseLLMProvider {
  readonly name: ProviderName;

  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: OpenAICompatibleLLMConfig) {
    super();
    this.name = (config.name as ProviderName) ?? "openai-compatible";
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL.replace(/\/+$/, "");
    this.defaultModel = config.model ?? "gpt-4o-mini";
  }

  protected async fetchLLM(request: LLMRequest): Promise<LLMResponse> {
    const url = `${this.baseURL}/chat/completions`;

    const messages: { role: string; content: string }[] = [];

    if (request.systemInstruction) {
      messages.push({ role: "system", content: request.systemInstruction });
    }

    messages.push({ role: "user", content: request.message });

    const body: Record<string, unknown> = {
      model: request.model ?? this.defaultModel,
      messages,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `${this.name} LLM error ${response.status}: ${errText}`,
      );
    }

    const result = await response.json();
    const text = result?.choices?.[0]?.message?.content ?? "";

    return {
      text,
      provider: this.name,
      model: request.model ?? this.defaultModel,
    };
  }
}
