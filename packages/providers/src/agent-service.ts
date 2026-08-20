import type {
  AgentPersona,
  LLMRequest,
  LLMResponse,
  TTSRequest,
  TTSResponse,
} from "@nusantara/core";
import type { ProviderRegistry } from "./provider-registry";

export interface PersonaConfig {
  name: string;
  systemInstruction: string;
  defaultVoice: string;
  defaultLLMModel: string;
  defaultTTSModel: string;
  greeting: string;
}

export const PERSONAS: Record<AgentPersona, PersonaConfig> = {
  jawa_medok: {
    name: "Mas Budi",
    systemInstruction:
      "Anda adalah Mas Budi, asisten AI orang Jawa Medok yang ramah, sopan, sering memakai sisipan bahasa Jawa yang hangat (nggih, sampeyan, piye, matur nuwun). " +
      "Anda ahli dalam membuat naskah, menerjemahkan ke bahasa Jawa, dan bercerita. " +
      "Balas dengan singkat dan natural.",
    defaultVoice: "Puck",
    defaultLLMModel: "gemini-3-flash-preview",
    defaultTTSModel: "gemini-2.5-flash-preview-tts",
    greeting:
      "Sugeng rawuh! Halo, saya Mas Budi. Ada yang bisa saya bantu hari ini? " +
      "Saya bisa bantu buat naskah, terjemahkan ke bahasa Jawa, atau cerita lucu!",
  },
  sunda_halus: {
    name: "Ceu Edah",
    systemInstruction:
      "Anda adalah Ceu Edah, asisten Sunda yang merdu, ramah, dan supel. " +
      "Sering memakai kata-kata Sunda yang hangat (sampurasun, wilujeng, hatur nuhun). " +
      "Anda ahli dalam membuat naskah, menerjemahkan ke bahasa Sunda. " +
      "Balas dengan singkat dan natural.",
    defaultVoice: "Aoede",
    defaultLLMModel: "gemini-3-flash-preview",
    defaultTTSModel: "gemini-2.5-flash-preview-tts",
    greeting:
      "Sampurasun! Wilujeng sumping. Sumping di Ceu Edah. " +
      "Dupi abdi tiasa ngabantosan nanaon dinten ieu?",
  },
  pembaca_berita: {
    name: "Reporter Nusantara",
    systemInstruction:
      "Anda adalah reporter berita profesional Nusantara. " +
      "Bicara dengan jelas, formal, dan berwibawa seperti pembaca berita TV. " +
      "Gunakan bahasa Indonesia baku dengan artikulasi yang sempurna. " +
      "Balas dengan ringkas dan informatif.",
    defaultVoice: "Charon",
    defaultLLMModel: "gemini-3-flash-preview",
    defaultTTSModel: "gemini-2.5-flash-preview-tts",
    greeting:
      "Selamat datang di Redaksi Berita Nusantara. " +
      "Saya siap membantu Anda membuat naskah berita atau narasi formal.",
  },
  asisten_sopan: {
    name: "Virtual Assistant",
    systemInstruction:
      "Anda adalah Virtual Assistant profesional yang ramah, sopan, dan efisien. " +
      "Gunakan bahasa Indonesia yang baik dan benar. " +
      "Balas dengan jelas, singkat, dan membantu.",
    defaultVoice: "Kore",
    defaultLLMModel: "gemini-3-flash-preview",
    defaultTTSModel: "gemini-2.5-flash-preview-tts",
    greeting:
      "Halo! Saya Virtual Assistant Anda. " +
      "Ada yang bisa saya bantu hari ini?",
  },
  custom: {
    name: "AI Assistant",
    systemInstruction:
      "Anda adalah AI Assistant yang membantu pengguna dengan berbagai permintaan. " +
      "Balas dengan ramah, singkat, dan informatif.",
    defaultVoice: "Kore",
    defaultLLMModel: "gemini-3-flash-preview",
    defaultTTSModel: "gemini-2.5-flash-preview-tts",
    greeting: "Halo! Ada yang bisa saya bantu?",
  },
};

// ============================================================
// Chat History
// ============================================================

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  voice?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  persona: AgentPersona;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Agent Service (with session cleanup)
// ============================================================

const MAX_SESSIONS = 100;
const SESSION_TTL_MS = 3600_000; // 1 hour

export class AgentService {
  private sessions: Map<string, ChatSession> = new Map();
  private registry: ProviderRegistry;

  constructor(registry: ProviderRegistry) {
    this.registry = registry;
  }

  private cleanupSessions(): void {
    if (this.sessions.size <= MAX_SESSIONS) return;

    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }

    if (this.sessions.size > MAX_SESSIONS) {
      const oldest = Array.from(this.sessions.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)
        .slice(0, this.sessions.size - MAX_SESSIONS);
      for (const [id] of oldest) {
        this.sessions.delete(id);
      }
    }
  }

  getPersona(persona: AgentPersona): PersonaConfig {
    return PERSONAS[persona] ?? PERSONAS.custom;
  }

  createSession(persona: AgentPersona = "asisten_sopan"): ChatSession {
    this.cleanupSessions();

    const id = crypto.randomUUID();
    const session: ChatSession = {
      id,
      persona,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  addMessage(
    sessionId: string,
    role: "user" | "agent",
    text: string,
    voice?: string,
  ): ChatMessage | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      text,
      voice,
      timestamp: Date.now(),
    };

    session.messages.push(message);
    session.updatedAt = Date.now();
    return message;
  }

  async chat(
    sessionId: string,
    userMessage: string,
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }

    this.addMessage(sessionId, "user", userMessage);

    const persona = this.getPersona(session.persona);

    const historyText = session.messages
      .slice(-10)
      .map((m) => `${m.role === "user" ? "User" : persona.name}: ${m.text}`)
      .join("\n");

    const fullPrompt = historyText
      ? `Riwayat percakapan:\n${historyText}\n\nUser: ${userMessage}`
      : userMessage;

    const llmProvider = this.registry.autoSelectLLMProvider();
    if (!llmProvider) {
      throw new Error("No LLM provider available. Configure a provider in Settings.");
    }

    const llmResponse = await this.registry.generateLLM({
      message: fullPrompt,
      provider: llmProvider,
      model: persona.defaultLLMModel,
      systemInstruction: persona.systemInstruction,
    });

    const agentMessage = this.addMessage(
      sessionId,
      "agent",
      llmResponse.text,
      persona.defaultVoice,
    );

    return agentMessage!;
  }

  async speak(
    text: string,
    voice?: string,
    provider?: string,
  ): Promise<TTSResponse> {
    const ttsProvider = (provider as any) ?? this.registry.autoSelectTTSProvider();
    if (!ttsProvider) {
      throw new Error("No TTS provider available");
    }

    const modelDefaults: Record<string, { model: string; voice: string }> = {
      gemini: { model: "gemini-2.5-flash-preview-tts", voice: "Kore" },
      openai: { model: "tts-1", voice: "alloy" },
      openrouter: { model: "openai/tts-1", voice: "alloy" },
    };

    const d = modelDefaults[ttsProvider] ?? { model: "tts-1", voice: "alloy" };

    return this.registry.generateTTS({
      text,
      provider: ttsProvider,
      model: d.model,
      voice: voice ?? d.voice,
      format: "wav",
    });
  }
}
