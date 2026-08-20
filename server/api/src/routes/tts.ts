import { Hono } from "hono";
import {
  GeminiProvider,
  OpenAIProvider,
  OpenRouterProvider,
  ProviderRegistry,
} from "@nusantara/providers";
import { pcmToWav } from "@nusantara/audio-engine";
import type { TTSRequest } from "@nusantara/core";
import { validate } from "../middleware/validator";

const registry = new ProviderRegistry();

const geminiKey = process.env.GEMINI_API_KEY ?? "";
if (geminiKey) {
  const gemini = new GeminiProvider({ apiKey: geminiKey });
  registry.registerTTS("gemini", gemini);
}

const openaiKey = process.env.OPENAI_API_KEY ?? "";
if (openaiKey) {
  const openai = new OpenAIProvider({ apiKey: openaiKey });
  registry.registerTTS("openai", openai);
}

const openrouterKey = process.env.OPENROUTER_API_KEY ?? "";
if (openrouterKey) {
  const openrouter = new OpenRouterProvider({ apiKey: openrouterKey });
  registry.registerTTS("openrouter", openrouter);
}

export { registry as providerRegistry };

export const ttsRoutes = new Hono();

ttsRoutes.get("/providers", (c) => {
  return c.json({ providers: registry.getTTSProviders() });
});

ttsRoutes.post(
  "/generate",
  validate({
    text: { type: "string", required: true, minLength: 1, maxLength: 5000 },
    provider: {
      type: "enum",
      required: false,
      values: ["gemini", "openai", "openrouter"] as const,
    },
    model: { type: "string", required: false },
  }),
  async (c) => {
    try {
      const body = await c.req.json<
        Partial<TTSRequest> & { preset?: string }
      >();

      if (!body.text?.trim()) {
        return c.json({ error: "Text is required" }, 400);
      }

      const providerName = registry.autoSelectTTSProvider(body.provider);

      if (!providerName) {
        return c.json(
          {
            error: "No TTS provider available. Configure GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY.",
          },
          500,
        );
      }

      const defaults: Record<string, { model: string; voice: string }> = {
        gemini: { model: "gemini-2.5-flash-preview-tts", voice: "Kore" },
        openai: { model: "tts-1", voice: "alloy" },
        openrouter: { model: "openai/tts-1", voice: "alloy" },
      };

      const d = defaults[providerName] ?? defaults.gemini;

      const request: TTSRequest = {
        text: body.text,
        provider: providerName,
        model: body.model ?? d.model,
        voice: body.voice ?? d.voice,
        instructions: body.instructions,
        speed: body.speed,
        emotion: body.emotion,
        format: body.format ?? "wav",
      };

      const response = await registry.generateTTS(request);

      const isGeminiResponse =
        response.mimeType.includes("L16") || response.mimeType.includes("pcm");

      if (isGeminiResponse) {
        const wavBlob = pcmToWav(new Int16Array(response.audio), 24000);
        return new Response(wavBlob, {
          headers: {
            "Content-Type": "audio/wav",
            "Content-Disposition":
              'attachment; filename="nusantara-voice.wav"',
          },
        });
      }

      return new Response(response.audio, {
        headers: {
          "Content-Type": response.mimeType,
          "Content-Disposition":
            'attachment; filename="nusantara-voice.wav"',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("TTS generate error:", message);
      return c.json({ error: message }, 500);
    }
  },
);

ttsRoutes.post(
  "/generate-multi",
  validate({
    dialogue: { type: "string", required: true, minLength: 1 },
    speakers: {
      type: "array",
      required: true,
      minItems: 1,
      maxItems: 10,
    },
  }),
  async (c) => {
    try {
      const body = await c.req.json();

      if (!body.dialogue?.trim()) {
        return c.json({ error: "Dialogue is required" }, 400);
      }

      if (!body.speakers?.length) {
        return c.json(
          { error: "At least one speaker is required" },
          400,
        );
      }

      const providerName = body.provider ?? "gemini";

      const response = await registry.generateMultiSpeaker({
        dialogue: body.dialogue,
        provider: providerName,
        model: body.model ?? "gemini-2.5-flash-preview-tts",
        speakers: body.speakers,
        format: body.format ?? "wav",
      });

      const wavBlob = pcmToWav(new Int16Array(response.audio), 24000);

      return new Response(wavBlob, {
        headers: {
          "Content-Type": "audio/wav",
          "Content-Disposition":
            'attachment; filename="nusantara-podcast.wav"',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Multi-speaker TTS error:", message);
      return c.json({ error: message }, 500);
    }
  },
);
