import type { TTSRequest, TTSResponse, ProviderName } from "@nusantara/core";

export abstract class BaseProvider {
  abstract readonly name: ProviderName;

  protected abstract fetchTTS(request: TTSRequest): Promise<TTSResponse>;

  async generateTTS(request: TTSRequest): Promise<TTSResponse> {
    this.validateRequest(request);
    return this.fetchTTS(request);
  }

  protected validateRequest(request: TTSRequest): void {
    if (!request.text?.trim()) {
      throw new Error("Text is required");
    }
    if (request.text.length > 4096) {
      throw new Error("Text exceeds maximum length of 4096 characters");
    }
  }

  protected buildFullPrompt(
    text: string,
    customInstruction?: string,
    speed?: string,
    emotion?: string,
  ): string {
    const parts: string[] = [];
    if (customInstruction) parts.push(customInstruction);
    if (speed) parts.push(`Gunakan tempo ${speed}`);
    if (emotion) parts.push(`ekspresi ${emotion}`);
    const prefix = parts.length > 0 ? `(${parts.join(", ")}): ` : "";
    return `${prefix}${text}`;
  }
}
