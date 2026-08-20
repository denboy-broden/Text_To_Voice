export type {
  ProviderName,
  ProviderConfig,
  Modality,
  ModelCapabilities,
  ModelInfo,
  TTSRequest,
  TTSUsage,
  TTSResponse,
  SpeakerConfig,
  MultiSpeakerTTSRequest,
  AgentPersona,
  LLMRequest,
  LLMResponse,
  AudioFormat,
  SampleFormat,
  AudioMetadata,
  WAVHeader,
  DialectPreset,
  TTSProvider,
  LLMProvider,
  AudioEngine,
} from "./types";

export {
  DIALECT_PRESETS,
  VOICES,
  MODEL_REGISTRY,
  getPresetByKey,
  getTTSModels,
  getLLMModels,
  getVoicesForModel,
} from "./presets";

export type { VoiceInfo } from "./presets";

export { PluginRegistry, pluginRegistry } from "./plugins/plugin-system";
export type { Plugin, PluginContext, PluginHook } from "./plugins/plugin-system";
export { AudioCachePlugin } from "./plugins/audio-cache-plugin";
export { WebhookPlugin } from "./plugins/webhook-plugin";

export { SkillRegistry, skillRegistry } from "./skills/skill-system";
export type { Skill, SkillResult } from "./skills/skill-system";
export { BatchTTSSkill } from "./skills/batch-tts-skill";
export { ExportAudioSkill } from "./skills/export-audio-skill";
