import { Hono } from "hono";
import { MODEL_REGISTRY, VOICES, DIALECT_PRESETS } from "@nusantara/core";
import type { ProviderRegistry } from "@nusantara/providers";

export function createModelsRoutes(registry: ProviderRegistry): Hono {
  const modelsRoutes = new Hono();

  modelsRoutes.get("/", (c) => {
    return c.json({
      models: MODEL_REGISTRY,
      voices: VOICES,
      presets: DIALECT_PRESETS,
      availableTTSProviders: registry.getTTSProviders(),
      availableLLMProviders: registry.getLLMProviders(),
    });
  });

  modelsRoutes.get("/tts", (c) => {
    const ttsModels = MODEL_REGISTRY.filter((m) => m.capabilities.tts);
    return c.json({
      models: ttsModels,
      providers: registry.getTTSProviders(),
    });
  });

  modelsRoutes.get("/llm", (c) => {
    const llmModels = MODEL_REGISTRY.filter((m) => m.capabilities.llm);
    return c.json({
      models: llmModels,
      providers: registry.getLLMProviders(),
    });
  });

  modelsRoutes.get("/voices", (c) => {
    return c.json({ voices: VOICES });
  });

  modelsRoutes.get("/presets", (c) => {
    return c.json({ presets: DIALECT_PRESETS });
  });

  return modelsRoutes;
}
