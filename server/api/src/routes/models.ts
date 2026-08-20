import { Hono } from "hono";
import { MODEL_REGISTRY, VOICES, DIALECT_PRESETS } from "@nusantara/core";
import { providerRegistry } from "./tts";

export const modelsRoutes = new Hono();

modelsRoutes.get("/", (c) => {
  return c.json({
    models: MODEL_REGISTRY,
    voices: VOICES,
    presets: DIALECT_PRESETS,
    availableTTSProviders: providerRegistry.getTTSProviders(),
    availableLLMProviders: providerRegistry.getLLMProviders(),
  });
});

modelsRoutes.get("/tts", (c) => {
  const ttsModels = MODEL_REGISTRY.filter((m) => m.capabilities.tts);
  return c.json({
    models: ttsModels,
    providers: providerRegistry.getTTSProviders(),
  });
});

modelsRoutes.get("/llm", (c) => {
  const llmModels = MODEL_REGISTRY.filter((m) => m.capabilities.llm);
  return c.json({
    models: llmModels,
    providers: providerRegistry.getLLMProviders(),
  });
});

modelsRoutes.get("/voices", (c) => {
  return c.json({ voices: VOICES });
});

modelsRoutes.get("/presets", (c) => {
  return c.json({ presets: DIALECT_PRESETS });
});
