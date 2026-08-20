import { Hono } from "hono";
import { pluginRegistry, skillRegistry, BatchTTSSkill } from "@nusantara/core";
import { providerRegistry } from "./tts";

// ============================================================
// Plugin Routes
// ============================================================

export const pluginRoutes = new Hono();

pluginRoutes.get("/", (c) => {
  const plugins = pluginRegistry.list().map((p) => ({
    name: p.name,
    version: p.version,
    hooks: p.hooks,
  }));
  return c.json({ plugins });
});

pluginRoutes.get("/cache/stats", (c) => {
  const cache = pluginRegistry.get("audio-cache") as any;
  if (!cache?.getStats) {
    return c.json({ error: "Audio cache plugin not available" }, 404);
  }
  return c.json(cache.getStats());
});

pluginRoutes.post("/cache/clear", async (c) => {
  const cache = pluginRegistry.get("audio-cache") as any;
  if (!cache?.clear) {
    return c.json({ error: "Audio cache plugin not available" }, 404);
  }
  cache.clear();
  return c.json({ cleared: true });
});

// ============================================================
// Batch TTS Routes
// ============================================================

export const batchRoutes = new Hono();

batchRoutes.post("/tts", async (c) => {
  try {
    const body = await c.req.json<{
      provider?: "gemini" | "openai";
      model?: string;
      items: { text: string; voice?: string; label?: string }[];
      parallel?: boolean;
      maxConcurrency?: number;
    }>();

    if (!body.items?.length) {
      return c.json({ error: "items array is required" }, 400);
    }

    if (body.items.length > 50) {
      return c.json({ error: "Maximum 50 items per batch" }, 400);
    }

    const provider = body.provider ?? providerRegistry.autoSelectTTSProvider() ?? "gemini";
    const model =
      body.model ??
      (provider === "openai" ? "tts-1" : "gemini-2.5-flash-preview-tts");

    const generateFn = (request: any) =>
      providerRegistry.generateTTS(request);

    const skill = new BatchTTSSkill(generateFn);
    const result = await skill.execute({
      provider,
      model,
      items: body.items,
      parallel: body.parallel ?? true,
      maxConcurrency: body.maxConcurrency ?? 3,
    });

    if (!result.success) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({
      batchId: crypto.randomUUID(),
      provider,
      model,
      ...result.data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Batch TTS error:", message);
    return c.json({ error: message }, 500);
  }
});

batchRoutes.get("/tts/:batchId", async (c) => {
  return c.json({
    note: "Batch status is returned inline. Polling not needed for sync batches.",
  });
});
