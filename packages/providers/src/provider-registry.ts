import type {
  ProviderName,
  TTSProvider,
  LLMProvider,
  TTSRequest,
  TTSResponse,
  MultiSpeakerTTSRequest,
  LLMRequest,
  LLMResponse,
} from "@nusantara/core";
import type { TTSProviderAdapter } from "@nusantara/tts-engine";

interface ProviderEntry {
  tts?: TTSProviderAdapter;
  llm?: LLMProvider;
}

export class ProviderRegistry {
  private providers: Map<ProviderName, ProviderEntry> = new Map();

  register(name: ProviderName, entry: ProviderEntry): void {
    this.providers.set(name, entry);
  }

  registerTTS(name: ProviderName, adapter: TTSProviderAdapter): void {
    const existing = this.providers.get(name) ?? {};
    this.providers.set(name, { ...existing, tts: adapter });
  }

  registerLLM(name: ProviderName, provider: LLMProvider): void {
    const existing = this.providers.get(name) ?? {};
    this.providers.set(name, { ...existing, llm: provider });
  }

  getTTS(name: ProviderName): TTSProviderAdapter | undefined {
    return this.providers.get(name)?.tts;
  }

  getLLM(name: ProviderName): LLMProvider | undefined {
    return this.providers.get(name)?.llm;
  }

  getRegisteredProviders(): ProviderName[] {
    return Array.from(this.providers.keys());
  }

  getTTSProviders(): ProviderName[] {
    return Array.from(this.providers.entries())
      .filter(([, e]) => !!e.tts)
      .map(([name]) => name);
  }

  getLLMProviders(): ProviderName[] {
    return Array.from(this.providers.entries())
      .filter(([, e]) => !!e.llm)
      .map(([name]) => name);
  }

  async generateTTS(request: TTSRequest): Promise<TTSResponse> {
    const adapter = this.getTTS(request.provider);
    if (!adapter) {
      throw new Error(
        `TTS provider "${request.provider}" not available. ` +
          `Registered: ${this.getTTSProviders().join(", ")}`,
      );
    }
    return adapter.generateTTS(request);
  }

  async generateMultiSpeaker(
    request: MultiSpeakerTTSRequest,
  ): Promise<TTSResponse> {
    const adapter = this.getTTS(request.provider);
    if (!adapter) {
      throw new Error(
        `TTS provider "${request.provider}" not available`,
      );
    }
    if (!adapter.generateMultiSpeaker) {
      throw new Error(
        `Provider "${request.provider}" does not support multi-speaker TTS`,
      );
    }
    return adapter.generateMultiSpeaker(request);
  }

  async generateLLM(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.getLLM(request.provider);
    if (!provider) {
      throw new Error(
        `LLM provider "${request.provider}" not available. ` +
          `Registered: ${this.getLLMProviders().join(", ")}`,
      );
    }
    return provider.generateLLM(request);
  }

  autoSelectTTSProvider(
    preferred?: ProviderName,
  ): ProviderName | undefined {
    if (preferred && this.getTTS(preferred)) {
      return preferred;
    }
    const ttsProviders = this.getTTSProviders();
    if (ttsProviders.includes("openai")) return "openai";
    if (ttsProviders.includes("gemini")) return "gemini";
    if (ttsProviders.length > 0) return ttsProviders[0];
    return undefined;
  }

  autoSelectLLMProvider(
    preferred?: ProviderName,
  ): ProviderName | undefined {
    if (preferred && this.getLLM(preferred)) {
      return preferred;
    }
    const llmProviders = this.getLLMProviders();
    if (llmProviders.includes("openai")) return "openai";
    if (llmProviders.includes("gemini")) return "gemini";
    if (llmProviders.length > 0) return llmProviders[0];
    return undefined;
  }
}
