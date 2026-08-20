import { Hono } from "hono";
import { pcmToWav } from "@nusantara/audio-engine";
import type { TTSRequest, ProviderName } from "@nusantara/core";
import type { ProviderRegistry } from "@nusantara/providers";
import { validate } from "../middleware/validator";

export function createTTSRoutes(registry: ProviderRegistry): Hono {
  const ttsRoutes = new Hono();

  const PREVIEW_TEXT = "Selamat datang di Nusantara Voice AI. Ini adalah contoh suara untuk preview.";

  ttsRoutes.get("/providers", (c) => {
    return c.json({ providers: registry.getTTSProviders() });
  });

  ttsRoutes.post("/preview", async (c) => {
    try {
      const body = await c.req.json<{
        voice?: string;
        provider?: string;
        model?: string;
        text?: string;
        instructions?: string;
      }>();

      const providerName = registry.autoSelectTTSProvider(body.provider as ProviderName);
      if (!providerName) {
        return c.json({ error: "No TTS provider available" }, 500);
      }

      const defaults: Record<string, { model: string; voice: string }> = {
        gemini: { model: "gemini-2.5-flash-preview-tts", voice: "Kore" },
        openai: { model: "tts-1", voice: "alloy" },
        openrouter: { model: "openai/tts-1", voice: "alloy" },
      };
      const d = defaults[providerName as string] ?? { model: "tts-1", voice: "alloy" };

      const request: TTSRequest = {
        text: body.text?.trim() || PREVIEW_TEXT,
        provider: providerName,
        model: body.model ?? d.model,
        voice: body.voice ?? d.voice,
        instructions: body.instructions,
        format: "wav",
      };

      const response = await registry.generateTTS(request);

      const isPCM = response.mimeType.includes("L16") || response.mimeType.includes("pcm");

      if (isPCM) {
        const wavBlob = pcmToWav(new Int16Array(response.audio), 24000);
        return new Response(wavBlob, {
          headers: { "Content-Type": "audio/wav" },
        });
      }

      return new Response(response.audio, {
        headers: { "Content-Type": response.mimeType },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("TTS preview error:", message);
      return c.json({ error: message }, 500);
    }
  });

  ttsRoutes.post(
    "/generate",
    validate({
      text: { type: "string", required: true, minLength: 1, maxLength: 5000 },
      provider: { type: "string", required: false },
      model: { type: "string", required: false },
    }),
    async (c) => {
      try {
        const body = await c.req.json<Partial<TTSRequest> & { preset?: string }>();

        if (!body.text?.trim()) {
          return c.json({ error: "Text is required" }, 400);
        }

        const providerName = registry.autoSelectTTSProvider(body.provider as ProviderName);

        if (!providerName) {
          return c.json(
            { error: "No TTS provider available. Configure a provider in Settings." },
            500,
          );
        }

        const adapter = registry.getTTS(providerName);
        const providerConfig = adapter ? { provider: providerName, model: body.model ?? "", voice: body.voice ?? "" } : null;

        const defaults: Record<string, { model: string; voice: string }> = {
          gemini: { model: "gemini-2.5-flash-preview-tts", voice: "Kore" },
          openai: { model: "tts-1", voice: "alloy" },
          openrouter: { model: "openai/tts-1", voice: "alloy" },
        };

        const d = defaults[providerName as string] ?? { model: "tts-1", voice: "alloy" };

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
              "Content-Disposition": 'attachment; filename="nusantara-voice.wav"',
            },
          });
        }

        return new Response(response.audio, {
          headers: {
            "Content-Type": response.mimeType,
            "Content-Disposition": 'attachment; filename="nusantara-voice.wav"',
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
          return c.json({ error: "At least one speaker is required" }, 400);
        }

        const providerName = registry.autoSelectTTSProvider(body.provider) ?? registry.getTTSProviders()[0];

        if (!providerName) {
          return c.json({ error: "No TTS provider available" }, 500);
        }

        const response = await registry.generateMultiSpeaker({
          dialogue: body.dialogue,
          provider: providerName,
          model: body.model ?? "gemini-2.5-flash-preview-tts",
          speakers: body.speakers,
          format: body.format ?? "wav",
        });

        const isPCM = response.mimeType.includes("L16") || response.mimeType.includes("pcm");

        if (isPCM) {
          const wavBlob = pcmToWav(new Int16Array(response.audio), 24000);
          return new Response(wavBlob, {
            headers: {
              "Content-Type": "audio/wav",
              "Content-Disposition": 'attachment; filename="nusantara-podcast.wav"',
            },
          });
        }

        return new Response(response.audio, {
          headers: {
            "Content-Type": response.mimeType,
            "Content-Disposition": 'attachment; filename="nusantara-podcast.wav"',
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Multi-speaker TTS error:", message);
        return c.json({ error: message }, 500);
      }
    },
  );

  return ttsRoutes;
}
