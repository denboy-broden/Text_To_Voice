import { Hono } from "hono";
import {
  AgentService,
  PERSONAS,
} from "@nusantara/providers";
import { pcmToWav } from "@nusantara/audio-engine";
import type { ProviderRegistry } from "@nusantara/providers";
import { validate } from "../middleware/validator";

export function createAgentRoutes(registry: ProviderRegistry): Hono {
  const agentService = new AgentService(registry);
  const agentRoutes = new Hono();

  agentRoutes.get("/providers", (c) => {
    return c.json({ providers: registry.getLLMProviders() });
  });

  agentRoutes.get("/personas", (c) => {
    const personas = Object.entries(PERSONAS).map(([key, config]) => ({
      id: key,
      name: config.name,
      description: config.systemInstruction.slice(0, 100) + "...",
      voice_id: config.defaultVoice,
      system_prompt: config.systemInstruction,
      language: "id",
      dialect: key.includes("jawa") ? "jawa" : key.includes("sunda") ? "sunda" : "baku",
      personality: "friendly",
    }));
    return c.json({ personas });
  });

  agentRoutes.post("/session", async (c) => {
    const body = await c.req.json<{ persona_id?: string; persona?: string }>().catch(() => ({}));
    const personaKey = body.persona_id ?? body.persona ?? "asisten_sopan";

    const validKeys = Object.keys(PERSONAS);
    const normalized = validKeys.includes(personaKey) ? personaKey : "asisten_sopan";

    const session = agentService.createSession(normalized as any);
    const persona = agentService.getPersona(session.persona);

    return c.json({
      id: session.id,
      sessionId: session.id,
      persona_id: session.persona,
      persona: session.persona,
      greeting: persona.greeting,
      voice: persona.defaultVoice,
      messages: [],
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
          session_id?: string;
          message: string;
          persona?: string;
          persona_id?: string;
        }>();

        if (!body.message?.trim()) {
          return c.json({ error: "Message is required" }, 400);
        }

        let sessionId = body.sessionId ?? body.session_id;

        if (!sessionId) {
          const personaKey = body.persona ?? body.persona_id ?? "asisten_sopan";
          const validKeys = Object.keys(PERSONAS);
          const normalized = validKeys.includes(personaKey) ? personaKey : "asisten_sopan";
          const session = agentService.createSession(normalized as any);
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
          message: {
            id: reply.id,
            role: "assistant",
            content: reply.text,
            created_at: new Date(reply.timestamp).toISOString(),
          },
          reply: reply.text,
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
          provider?: string;
          persona_id?: string;
        }>();

        if (!body.text?.trim()) {
          return c.json({ error: "Text is required" }, 400);
        }

        const response = await agentService.speak(
          body.text,
          body.voice,
          body.provider as any,
        );

        const isPCM =
          response.mimeType.includes("L16") || response.mimeType.includes("pcm");

        if (isPCM) {
          const wavBlob = pcmToWav(new Int16Array(response.audio), 24000);
          return new Response(wavBlob, {
            headers: {
              "Content-Type": "audio/wav",
              "Content-Disposition": 'attachment; filename="agent-voice.wav"',
            },
          });
        }

        return new Response(response.audio, {
          headers: {
            "Content-Type": response.mimeType,
            "Content-Disposition": 'attachment; filename="agent-voice.wav"',
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
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role === "agent" ? "assistant" : m.role,
        content: m.text,
        created_at: new Date(m.timestamp).toISOString(),
      })),
    });
  });

  return agentRoutes;
}
