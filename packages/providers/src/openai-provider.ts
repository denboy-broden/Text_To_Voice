import type {
  TTSRequest,
  TTSResponse,
  ProviderName,
} from "@nusantara/core";
import { BaseProvider } from "./base-provider";

interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
}

export class OpenAIProvider extends BaseProvider {
  readonly name: ProviderName = "openai";

  private apiKey: string;
  private baseURL: string;

  constructor(config: OpenAIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL ?? "https://api.openai.com/v1";
  }

  protected async fetchTTS(request: TTSRequest): Promise<TTSResponse> {
    const url = `${this.baseURL}/audio/speech`;

    const body: Record<string, unknown> = {
      model: request.model ?? "tts-1",
      voice: request.voice ?? "alloy",
      input: request.text,
    };

    if (request.instructions) {
      body.instructions = request.instructions;
    }

    if (request.speed) {
      body.speed = this.mapSpeedToNumber(request.speed);
    }

    if (request.format) {
      body.response_format = request.format === "wav" ? "wav" : request.format;
    }

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
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      audio: audioBuffer,
      mimeType: response.headers.get("content-type") ?? "audio/wav",
      format: request.format ?? "wav",
      provider: this.name,
      model: request.model ?? "tts-1",
    };
  }

  private mapSpeedToNumber(speedModifier: string): number {
    if (speedModifier.includes("lambat") || speedModifier.includes("santai")) {
      return 0.75;
    }
    if (speedModifier.includes("cepat") || speedModifier.includes("semangat")) {
      return 1.25;
    }
    return 1.0;
  }
}
