// packages/core/src/types.ts
// Internal type contracts for Text_To_Voice application

// ============================================================
// Provider Types
// ============================================================

export type ProviderName =
  | "openai"
  | "gemini"
  | "openrouter"
  | "openai-compatible"
  | "9router"
  | "omnirouter";

export interface ProviderConfig {
  name: ProviderName;
  baseURL: string;
  apiKey: string;
  models: ModelInfo[];
}

// ============================================================
// Model Registry
// ============================================================

export type Modality = "text" | "audio" | "multimodal";

export interface ModelCapabilities {
  tts: boolean;
  llm: boolean;
  streaming: boolean;
  multiSpeaker: boolean;
  voices: string[];
}

export interface ModelInfo {
  id: string;
  provider: ProviderName;
  displayName: string;
  modality: Modality;
  capabilities: ModelCapabilities;
}

// ============================================================
// TTS Types
// ============================================================

export interface TTSRequest {
  text: string;
  provider: ProviderName;
  model: string;
  voice?: string;
  language?: string;
  instructions?: string;
  speed?: number;
  emotion?: string;
  format?: "wav" | "mp3" | "ogg";
  metadata?: Record<string, unknown>;
}

export interface TTSUsage {
  characters?: number;
  credits?: number;
  durationMs?: number;
}

export interface TTSResponse {
  audio: ArrayBuffer;
  mimeType: string;
  format: "wav" | "mp3" | "ogg";
  duration?: number;
  provider: string;
  model: string;
  usage?: TTSUsage;
}

// ============================================================
// Multi-Speaker Types
// ============================================================

export interface SpeakerConfig {
  speaker: string;
  voice: string;
  accent?: string;
}

export interface MultiSpeakerTTSRequest {
  dialogue: string;
  provider: ProviderName;
  model: string;
  speakers: SpeakerConfig[];
  format?: "wav" | "mp3" | "ogg";
  metadata?: Record<string, unknown>;
}

// ============================================================
// LLM Types (AI Agent)
// ============================================================

export type AgentPersona =
  | "jawa_medok"
  | "sunda_halus"
  | "pembaca_berita"
  | "asisten_sopan"
  | "custom";

export interface LLMRequest {
  message: string;
  provider: ProviderName;
  model: string;
  systemInstruction?: string;
  persona?: AgentPersona;
  metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  text: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// ============================================================
// Audio Engine Types
// ============================================================

export type AudioFormat = "wav" | "mp3" | "ogg";
export type SampleFormat = "pcm_8" | "pcm_16" | "pcm_24" | "pcm_32" | "float_32" | "float_64";

export interface AudioMetadata {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  sampleFormat: SampleFormat;
  duration: number;
  totalSamples: number;
}

export interface WAVHeader {
  riff: {
    chunkID: "RIFF";
    chunkSize: number;
    format: "WAVE";
  };
  fmt: {
    chunkID: "fmt ";
    chunkSize: number;
    audioFormat: 1 | 3 | 65534;
    numChannels: number;
    sampleRate: number;
    byteRate: number;
    blockAlign: number;
    bitsPerSample: number;
  };
  data: {
    chunkID: "data";
    chunkSize: number;
  };
}

// ============================================================
// Dialect Preset Types
// ============================================================

export interface DialectPreset {
  key: string;
  name: string;
  defaultVoice: string;
  customInstruction: string;
  sampleText: string;
}

// ============================================================
// Provider Interface (abstract)
// ============================================================

export interface TTSProvider {
  readonly name: ProviderName;

  generateTTS(request: TTSRequest): Promise<TTSResponse>;
  generateMultiSpeaker?(request: MultiSpeakerTTSRequest): Promise<TTSResponse>;
  listVoices(): Promise<string[]>;
}

export interface LLMProvider {
  readonly name: ProviderName;

  generateLLM(request: LLMRequest): Promise<LLMResponse>;
}

// ============================================================
// Audio Engine Interface (abstract)
// ============================================================

export interface AudioEngine {
  pcmToWav(pcmData: Int16Array, sampleRate: number): Blob;
  decodeWav(wavData: ArrayBuffer): { pcm: Int16Array; metadata: AudioMetadata };
  extractMetadata(wavData: ArrayBuffer): AudioMetadata;
  base64ToPCM(base64: string): Int16Array;
  parseMimeType(mimeType: string): { sampleRate: number; channels: number; bitsPerSample: number };
  getWaveformData(pcmData: Int16Array, numPoints?: number): number[];
  normalizePCM(pcm: Int16Array, targetPeak?: number): Int16Array;
  getPeakLevel(pcm: Int16Array): number;
  getRMSLevel(pcm: Int16Array): number;
  getDuration(pcm: Int16Array, sampleRate: number): number;
}
