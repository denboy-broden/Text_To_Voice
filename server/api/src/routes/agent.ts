import { Hono } from "hono";
import {
  GeminiProvider,
  OpenAIProvider,
  GeminiLLMProvider,
  ProviderRegistry,
  AgentService,
  PERSONAS,
} from "@nusantara/providers";
import { pcmToWav } from "@nusantara/audio-engine";
import type { AgentPersona } from "@nusantara/core";
import { validate } from "../middleware/validator";

export { PERSONAS };

const registry = new ProviderRegistry();

const geminiKey = process.env.GEMINI_API_KEY ?? "";
if (geminiKey) {
  registry.registerTTS("gemini", new GeminiProvider({ apiKey: geminiKey }));
  registry.registerLLM("gemini", new GeminiLLMProvider({ apiKey: geminiKey }));
}

const openaiKey = process.env.OPENAI_API_KEY ?? "";
if (openaiKey) {
  registry.registerTTS("openai", new OpenAIProvider({ apiKey: openaiKey }));
}

const agentService = new AgentService(registry);

export { registry as providerRegistry };

export const agentRoutes = new Hono();

agentRoutes.get("/providers", (c) => {
  return c.json({ providers: registry.getLLMProviders() });
});

agentRoutes.get("/personas", (c) => {
  const personas = Object.entries(PERSONAS).map(([key, config]) => ({
    key,
    name: config.name,
    greeting: config.greeting,
    defaultVoice: config.defaultVoice,
  }));
  return c.json({ personas });
});

agentRoutes.post("/session", async (c) => {
  const body = await c.req.json<{ persona?: AgentPersona }>().catch(() => ({}));
  const session = agentService.createSession(body.persona ?? "asisten_sopan");
  const persona = agentService.getPersona(session.persona);

  return c.json({
    sessionId: session.id,
    persona: session.persona,
    greeting: persona.greeting,
    voice: persona.defaultVoice,
  });
});

agentRoutes.delete("/session/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = agentService.deleteSession(id);
  return c.json({ deleted });
});

agentRoutes.post(
  "/chat",
  validate({
    message: { type: "string", required: true, minLength: 1, maxLength: 2000 },
  }),
  async (c) => {
    try {
      const body = await c.req.json<{
        sessionId?: string;
        message: string;
        persona?: AgentPersona;
      }>();

      if (!body.message?.trim()) {
        return c.json({ error: "Message is required" }, 400);
      }

      let sessionId = body.sessionId;

      if (!sessionId) {
        const session = agentService.createSession(
          body.persona ?? "asisten_sopan",
        );
        sessionId = session.id;
      }

      const session = agentService.getSession(sessionId);
      if (!session) {
        return c.json({ error: `Session "${sessionId}" not found` }, 404);
      }

      const reply = await agentService.chat(sessionId, body.message);
      const persona = agentService.getPersona(session.persona);

      return c.json({
        sessionId,
        message: reply,
        persona: session.persona,
        voice: persona.defaultVoice,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Agent chat error:", message);
      return c.json({ error: message }, 500);
    }
  },
);

agentRoutes.post(
  "/speak",
  validate({
    text: { type: "string", required: true, minLength: 1, maxLength: 5000 },
  }),
  async (c) => {
    try {
      const body = await c.req.json<{
        text: string;
        voice?: string;
        provider?: "gemini" | "openai";
      }>();

      if (!body.text?.trim()) {
        return c.json({ error: "Text is required" }, 400);
      }

      const response = await agentService.speak(
        body.text,
        body.voice,
        body.provider,
      );

      const isPCM =
        response.mimeType.includes("L16") || response.mimeType.includes("pcm");

      if (isPCM) {
        const wavBlob = pcmToWav(new Int16Array(response.audio), 24000);
        return new Response(wavBlob, {
          headers: {
            "Content-Type": "audio/wav",
            "Content-Disposition":
              'attachment; filename="agent-voice.wav"',
          },
        });
      }

      return new Response(response.audio, {
        headers: {
          "Content-Type": response.mimeType,
          "Content-Disposition":
            'attachment; filename="agent-voice.wav"',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Agent speak error:", message);
      return c.json({ error: message }, 500);
    }
  },
);

agentRoutes.get("/session/:id/history", async (c) => {
  const id = c.req.param("id");
  const session = agentService.getSession(id);

  if (!session) {
    return c.json({ error: `Session "${id}" not found` }, 404);
  }

  return c.json({
    sessionId: session.id,
    persona: session.persona,
    messages: session.messages,
  });
});
