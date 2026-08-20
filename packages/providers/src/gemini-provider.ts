import type {
  TTSRequest,
  TTSResponse,
  MultiSpeakerTTSRequest,
  ProviderName,
} from "@nusantara/core";
import { BaseProvider } from "./base-provider";

interface GeminiConfig {
  apiKey: string;
  baseURL?: string;
}

export class GeminiProvider extends BaseProvider {
  readonly name: ProviderName = "gemini";

  private apiKey: string;
  private baseURL: string;

  constructor(config: GeminiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseURL =
      config.baseURL ??
      "https://generativelanguage.googleapis.com/v1beta";
  }

  protected async fetchTTS(request: TTSRequest): Promise<TTSResponse> {
    const fullText = this.buildFullPrompt(
      request.text,
      request.instructions,
    );

    const url = `${this.baseURL}/models/${request.model}:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: fullText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: request.voice ?? "Kore" },
          },
        },
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType =
      part?.inlineData?.mimeType ?? "audio/L16;rate=24000";

    if (!audioData) {
      throw new Error("No audio data received from Gemini");
    }

    return this.parseAudioResponse(audioData, mimeType, request.model);
  }

  async generateMultiSpeaker(
    request: MultiSpeakerTTSRequest,
  ): Promise<TTSResponse> {
    const speakerConfigs = request.speakers.map((s) => ({
      speaker: s.speaker,
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: s.voice },
      },
    }));

    const accentInstructions = request.speakers
      .map((s) => `${s.speaker} harus berbicara dengan ${s.accent ?? "natural"}`)
      .join("\n");

    const fullPrompt = `${accentInstructions}\n\nNaskah:\n${request.dialogue}`;

    const url = `${this.baseURL}/models/${request.model}:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakerConfigs,
          },
        },
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType =
      part?.inlineData?.mimeType ?? "audio/L16;rate=24000";

    if (!audioData) {
      throw new Error("No audio data received from Gemini multi-speaker");
    }

    return this.parseAudioResponse(audioData, mimeType, request.model);
  }

  private parseAudioResponse(
    base64Data: string,
    mimeType: string,
    model: string,
  ): TTSResponse {
    const sampleRateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch
      ? parseInt(sampleRateMatch[1], 10)
      : 24000;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return {
      audio: bytes.buffer,
      mimeType,
      format: "wav",
      provider: this.name,
      model,
    };
  }
}
