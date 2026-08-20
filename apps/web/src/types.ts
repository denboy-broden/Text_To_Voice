export interface TTSRequest {
  text: string;
  voice_id?: string;
  language?: string;
  dialect?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
  output_format?: "wav" | "mp3" | "ogg";
}

export interface TTSResponse {
  id: string;
  audio_url: string;
  duration_ms: number;
  sample_rate: number;
  created_at: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  dialect: string;
  gender: "male" | "female" | "neutral";
  preview_url?: string;
  tags: string[];
}

export interface AgentPersona {
  id: string;
  name: string;
  description: string;
  voice_id: string;
  system_prompt: string;
  language: string;
  dialect: string;
  personality: string;
  avatar_url?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  audio_url?: string;
  duration_ms?: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  persona_id: string;
  title?: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface DramaEpisode {
  id: string;
  title: string;
  description: string;
  script: DramaScene[];
  duration_ms?: number;
  cover_url?: string;
  created_at: string;
}

export interface DramaScene {
  id: string;
  character: string;
  voice_id: string;
  text: string;
  emotion?: string;
  pause_after_ms?: number;
}

export interface AudioFile {
  id: string;
  filename: string;
  url: string;
  duration_ms: number;
  size_bytes: number;
  format: string;
  source_type: "tts" | "agent" | "drama" | "upload";
  source_id?: string;
  tags: string[];
  created_at: string;
}

export interface APIError {
  detail: string;
  code: string;
}

export type LoadingState = "idle" | "loading" | "success" | "error";
