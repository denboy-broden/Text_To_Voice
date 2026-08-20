import type {
  LLMRequest,
  LLMResponse,
  ProviderName,
} from "@nusantara/core";
import { BaseLLMProvider } from "./base-llm-provider";

interface GeminiLLMConfig {
  apiKey: string;
  baseURL?: string;
}

export class GeminiLLMProvider extends BaseLLMProvider {
  readonly name: ProviderName = "gemini";

  private apiKey: string;
  private baseURL: string;

  constructor(config: GeminiLLMConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseURL =
      config.baseURL ??
      "https://generativelanguage.googleapis.com/v1beta";
  }

  protected async fetchLLM(request: LLMRequest): Promise<LLMResponse> {
    const url = `${this.baseURL}/models/${request.model}:generateContent?key=${this.apiKey}`;

    const payload: Record<string, unknown> = {
      contents: [{ parts: [{ text: request.message }] }],
    };

    if (request.systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: request.systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini LLM error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return {
      text,
      provider: this.name,
      model: request.model,
    };
  }
}
