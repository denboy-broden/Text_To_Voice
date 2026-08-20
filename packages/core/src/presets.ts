// packages/core/src/presets.ts
// Dialect presets and model registry seed data

import type { DialectPreset, ModelInfo } from "./types";

// ============================================================
// Dialect Presets
// ============================================================

export const DIALECT_PRESETS: DialectPreset[] = [
  {
    key: "jawa",
    name: "Jawa Medok",
    defaultVoice: "Kore",
    customInstruction:
      "Ucapkan kalimat berikut dalam bahasa Indonesia dengan gaya dan logat Jawa medok yang kental, hangat, dan sangat khas, gunakan intonasi pengucapan khas Jawa (pripun/medok):",
    sampleText:
      "Sugeng rawuh sedulur kabeh! Selamat datang di aplikasi Nusantara Voice AI. Piye kabare? Semoga sampeyan kabeh senantiasa sehat lan sukses selalu nggih!",
  },
  {
    key: "sunda",
    name: "Sunda Halus",
    defaultVoice: "Aoede",
    customInstruction:
      "Ucapkan dalam bahasa Indonesia dengan logat Sunda yang halus, mengayun, merdu, ramah, dan khas Priangan:",
    sampleText:
      "Sampurasun wargi sadayana! Wilujeng sumping di studio audio AI. Mugi-mugi dinten ieu dipaparin kabagjaan sareng kelancaran dina sagala urusan.",
  },
  {
    key: "gaul",
    name: "Jakarta / Gaul",
    defaultVoice: "Puck",
    customInstruction:
      "Ucapkan dengan gaya santai khas anak muda Jakarta / Betawi, sangat ekspresif, gaul dan natural:",
    sampleText:
      "Halo bro sist! Jujur ya, AI Voice Studio ini keren banget sih. Suaranya beneran smooth dan asik banget listened to. Coba langsung tes deh!",
  },
  {
    key: "formal",
    name: "Pembaca Berita",
    defaultVoice: "Charon",
    customInstruction:
      "Say in a clear, authoritative, highly professional TV news anchor voice in Indonesian with flawless articulation:",
    sampleText:
      "Selamat malam pemirsa, kembali bersama Berita Nusantara Utama. Hari ini perkembangan teknologi kecerdasan buatan di Indonesia mengalami kemajuan yang sangat pesat.",
  },
  {
    key: "dongeng",
    name: "Pendongeng",
    defaultVoice: "Sulafat",
    customInstruction:
      "Ucapkan dengan suara mendongeng yang penuh ekspresi, hangat, imajinatif, penuh keajaiban dan lembut:",
    sampleText:
      "Pada zaman dahulu kala, di sebuah desa lereng gunung yang hijau dan damai, hiduplah seorang pemuda pemimpi yang memiliki hati sangat mulia...",
  },
  {
    key: "anime",
    name: "Ceria / Energetik",
    defaultVoice: "Leda",
    customInstruction:
      "Say in an energetic, happy, upbeat, slightly enthusiastic pitch voice in Indonesian:",
    sampleText:
      "Halo teman-teman semuanya! Wah, hari ini cerah banget ya! Ayo kita mulai petualangan seru kita dengan penuh semangat!",
  },
];

// ============================================================
// Voice Definitions
// ============================================================

export interface VoiceInfo {
  name: string;
  gender: "male" | "female";
  description: string;
}

export const VOICES: VoiceInfo[] = [
  { name: "Kore", gender: "female", description: "Tegas & Jelas" },
  { name: "Puck", gender: "male", description: "Energetik & Ramah" },
  { name: "Zephyr", gender: "female", description: "Cerah & Hangat" },
  { name: "Charon", gender: "male", description: "Dalam & Wibawa" },
  { name: "Aoede", gender: "female", description: "Merdu & Santai" },
  { name: "Fenrir", gender: "male", description: "Bertenaga & Antusias" },
  { name: "Leda", gender: "female", description: "Muda & Halus" },
  { name: "Sulafat", gender: "female", description: "Hangat & Lembut" },
  { name: "Vindemiatrix", gender: "female", description: "Lembut & Tenang" },
  { name: "Algieba", gender: "male", description: "Smooth & Khas" },
];

// ============================================================
// Model Registry
// ============================================================

export const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: "gemini-2.5-flash-preview-tts",
    provider: "gemini",
    displayName: "Gemini 2.5 Flash TTS",
    modality: "audio",
    capabilities: {
      tts: true,
      llm: false,
      streaming: false,
      multiSpeaker: true,
      voices: VOICES.map((v) => v.name),
    },
  },
  {
    id: "gemini-3-flash-preview",
    provider: "gemini",
    displayName: "Gemini 3 Flash",
    modality: "text",
    capabilities: {
      tts: false,
      llm: true,
      streaming: true,
      multiSpeaker: false,
      voices: [],
    },
  },
  {
    id: "tts-1",
    provider: "openai",
    displayName: "OpenAI TTS-1",
    modality: "audio",
    capabilities: {
      tts: true,
      llm: false,
      streaming: true,
      multiSpeaker: false,
      voices: ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"],
    },
  },
  {
    id: "tts-1-hd",
    provider: "openai",
    displayName: "OpenAI TTS-1 HD",
    modality: "audio",
    capabilities: {
      tts: true,
      llm: false,
      streaming: true,
      multiSpeaker: false,
      voices: ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"],
    },
  },
  {
    id: "gpt-4o-mini-tts",
    provider: "openai",
    displayName: "OpenAI GPT-4o Mini TTS",
    modality: "audio",
    capabilities: {
      tts: true,
      llm: false,
      streaming: true,
      multiSpeaker: false,
      voices: ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"],
    },
  },
];

// ============================================================
// Helpers
// ============================================================

export function getPresetByKey(key: string): DialectPreset | undefined {
  return DIALECT_PRESETS.find((p) => p.key === key);
}

export function getTTSModels(): ModelInfo[] {
  return MODEL_REGISTRY.filter((m) => m.capabilities.tts);
}

export function getLLMModels(): ModelInfo[] {
  return MODEL_REGISTRY.filter((m) => m.capabilities.llm);
}

export function getVoicesForModel(modelId: string): string[] {
  const model = MODEL_REGISTRY.find((m) => m.id === modelId);
  return model?.capabilities.voices ?? [];
}
