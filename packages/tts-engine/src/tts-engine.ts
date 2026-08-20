import type {
  TTSRequest,
  TTSResponse,
  MultiSpeakerTTSRequest,
  ProviderName,
} from "@nusantara/core";

export class TTSEngine {
  private providers: Map<ProviderName, TTSProviderAdapter> = new Map();

  registerProvider(name: ProviderName, adapter: TTSProviderAdapter): void {
    this.providers.set(name, adapter);
  }

  async generate(request: TTSRequest): Promise<TTSResponse> {
    const adapter = this.providers.get(request.provider);
    if (!adapter) {
      throw new Error(`Provider "${request.provider}" not registered`);
    }
    return adapter.generateTTS(request);
  }

  async generateMultiSpeaker(
    request: MultiSpeakerTTSRequest,
  ): Promise<TTSResponse> {
    const adapter = this.providers.get(request.provider);
    if (!adapter) {
      throw new Error(`Provider "${request.provider}" not registered`);
    }
    if (!adapter.generateMultiSpeaker) {
      throw new Error(
        `Provider "${request.provider}" does not support multi-speaker TTS`,
      );
    }
    return adapter.generateMultiSpeaker(request);
  }

  getRegisteredProviders(): ProviderName[] {
    return Array.from(this.providers.keys());
  }
}

export interface TTSProviderAdapter {
  readonly name: ProviderName;
  generateTTS(request: TTSRequest): Promise<TTSResponse>;
  generateMultiSpeaker?(request: MultiSpeakerTTSRequest): Promise<TTSResponse>;
}
