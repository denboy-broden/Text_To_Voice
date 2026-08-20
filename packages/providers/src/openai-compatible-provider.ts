import type {
  TTSRequest,
  TTSResponse,
  ProviderName,
} from "@nusantara/core";
import { BaseProvider } from "./base-provider";

interface OpenAICompatibleConfig {
  name?: ProviderName;
  apiKey: string;
  baseURL: string;
  model?: string;
  defaultVoice?: string;
  supportsInstructions?: boolean;
  supportsSpeed?: boolean;
}

export class OpenAICompatibleProvider extends BaseProvider {
  readonly name: ProviderName;

  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;
  private defaultVoice: string;
  private _supportsInstructions: boolean;
  private _supportsSpeed: boolean;

  constructor(config: OpenAICompatibleConfig) {
    super();
    this.name = config.name ?? "openai-compatible";
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL.replace(/\/+$/, "");
    this.defaultModel = config.model ?? "tts-1";
    this.defaultVoice = config.defaultVoice ?? "alloy";
    this._supportsInstructions = config.supportsInstructions ?? false;
    this._supportsSpeed = config.supportsSpeed ?? true;
  }

  get supportsInstructions(): boolean {
    return this._supportsInstructions;
  }

  get supportsSpeed(): boolean {
    return this._supportsSpeed;
  }

  protected async fetchTTS(request: TTSRequest): Promise<TTSResponse> {
    const url = `${this.baseURL}/audio/speech`;

    const body: Record<string, unknown> = {
      model: request.model ?? this.defaultModel,
      voice: request.voice ?? this.defaultVoice,
      input: request.text,
    };

    if (this._supportsInstructions && request.instructions) {
      body.instructions = request.instructions;
    }

    if (this._supportsSpeed && request.speed) {
      body.speed = this.mapSpeedToNumber(request.speed);
    }

    if (request.format) {
      body.response_format = request.format;
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
      throw new Error(
        `${this.name} API error ${response.status}: ${errText}`,
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      audio: audioBuffer,
      mimeType: response.headers.get("content-type") ?? "audio/wav",
      format: request.format ?? "wav",
      provider: this.name,
      model: request.model ?? this.defaultModel,
    };
  }

  private mapSpeedToNumber(speedModifier: number | string): number {
    if (typeof speedModifier === "number") {
      return Math.max(0.25, Math.min(4.0, speedModifier));
    }
    if (speedModifier.includes("lambat") || speedModifier.includes("santai")) {
      return 0.75;
    }
    if (speedModifier.includes("cepat") || speedModifier.includes("semangat")) {
      return 1.25;
    }
    return 1.0;
  }
}
