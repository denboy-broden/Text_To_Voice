import { Hono } from "hono";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  OpenAICompatibleProvider,
  OpenAICompatibleLLMProvider,
  GeminiProvider,
  GeminiLLMProvider,
  OpenAIProvider,
  OpenRouterProvider,
  ProviderRegistry,
} from "@nusantara/providers";

// ============================================================
// Config File
// ============================================================

const CONFIG_PATH = resolve(process.cwd(), "config/providers.json");

interface ProviderConfig {
  id: string;
  type: "gemini" | "openai" | "openrouter" | "openai-compatible";
  apiKey?: string;
  baseURL?: string;
  name?: string;
  ttsModel?: string;
  llmModel?: string;
  defaultVoice?: string;
}

interface ConfigFile {
  providers: ProviderConfig[];
}

function loadConfig(): ConfigFile {
  if (!existsSync(CONFIG_PATH)) {
    return { providers: [] };
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { providers: [] };
  }
}

function saveConfig(config: ConfigFile): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// ============================================================
// Register from config
// ============================================================

export function registerProvidersFromConfig(registry: ProviderRegistry): void {
  const config = loadConfig();
  for (const p of config.providers) {
    registerSingleProvider(registry, p);
  }
  console.log(`[providers] Loaded ${config.providers.length} provider(s) from config`);
}

function registerSingleProvider(registry: ProviderRegistry, p: ProviderConfig): void {
  const name = p.id as any;

  switch (p.type) {
    case "gemini":
      if (p.apiKey) {
        registry.registerTTS(name, new GeminiProvider({ apiKey: p.apiKey }));
        registry.registerLLM(name, new GeminiLLMProvider({ apiKey: p.apiKey }));
      }
      break;
    case "openai":
      if (p.apiKey) {
        registry.registerTTS(name, new OpenAIProvider({ apiKey: p.apiKey }));
      }
      break;
    case "openrouter":
      if (p.apiKey) {
        registry.registerTTS(name, new OpenRouterProvider({ apiKey: p.apiKey }));
      }
      break;
    case "openai-compatible":
      if (p.apiKey && p.baseURL) {
        registry.registerTTS(
          name,
          new OpenAICompatibleProvider({
            name,
            apiKey: p.apiKey,
            baseURL: p.baseURL,
            model: p.ttsModel ?? "tts-1",
            defaultVoice: p.defaultVoice ?? "alloy",
            supportsInstructions: true,
          }),
        );
        registry.registerLLM(
          name,
          new OpenAICompatibleLLMProvider({
            name,
            apiKey: p.apiKey,
            baseURL: p.baseURL,
            model: p.llmModel ?? "gpt-4o-mini",
          }),
        );
      }
      break;
  }
}

// ============================================================
// Routes (factory — accepts registry)
// ============================================================

export function createProviderConfigRoutes(registry: ProviderRegistry): Hono {
  const routes = new Hono();

  // GET /api/providers
  routes.get("/", (c) => {
    const config = loadConfig();
    const providers = config.providers.map((p) => ({
      id: p.id,
      type: p.type,
      hasApiKey: !!p.apiKey,
      hasBaseURL: !!p.baseURL,
      name: p.name,
      ttsModel: p.ttsModel,
      llmModel: p.llmModel,
      defaultVoice: p.defaultVoice,
    }));
    return c.json({ providers });
  });

  // GET /api/providers/active/list
  routes.get("/active/list", (c) => {
    return c.json({
      tts: registry.getTTSProviders(),
      llm: registry.getLLMProviders(),
    });
  });

  // GET /api/providers/:id
  routes.get("/:id", (c) => {
    const id = c.req.param("id");
    if (id === "active") return c.json({ error: "Invalid ID" }, 400);

    const config = loadConfig();
    const provider = config.providers.find((p) => p.id === id);
    if (!provider) {
      return c.json({ error: `Provider "${id}" not found` }, 404);
    }
    return c.json({ provider });
  });

  // POST /api/providers
  routes.post("/", async (c) => {
    try {
      const body = await c.req.json<ProviderConfig>();

      if (!body.id?.trim()) return c.json({ error: "id is required" }, 400);
      if (!body.type) return c.json({ error: "type is required" }, 400);
      if (!body.apiKey?.trim()) return c.json({ error: "apiKey is required" }, 400);
      if (body.type === "openai-compatible" && !body.baseURL?.trim()) {
        return c.json({ error: "baseURL is required for openai-compatible" }, 400);
      }

      const config = loadConfig();
      const idx = config.providers.findIndex((p) => p.id === body.id);

      const entry: ProviderConfig = {
        id: body.id.trim(),
        type: body.type,
        apiKey: body.apiKey?.trim(),
        baseURL: body.baseURL?.trim(),
        name: body.name?.trim(),
        ttsModel: body.ttsModel?.trim(),
        llmModel: body.llmModel?.trim(),
        defaultVoice: body.defaultVoice?.trim(),
      };

      if (idx >= 0) {
        config.providers[idx] = entry;
      } else {
        config.providers.push(entry);
      }

      saveConfig(config);
      registerSingleProvider(registry, entry);

      return c.json({
        saved: true,
        provider: { id: entry.id, type: entry.type, hasApiKey: !!entry.apiKey },
        message: `Provider "${entry.id}" ${idx >= 0 ? "updated" : "added"}.`,
      });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
    }
  });

  // DELETE /api/providers/:id
  routes.delete("/:id", async (c) => {
    const id = c.req.param("id");
    if (id === "active") return c.json({ error: "Invalid ID" }, 400);

    const config = loadConfig();
    const idx = config.providers.findIndex((p) => p.id === id);
    if (idx < 0) return c.json({ error: `Provider "${id}" not found` }, 404);

    config.providers.splice(idx, 1);
    saveConfig(config);

    return c.json({ deleted: true, message: `Provider "${id}" deleted.` });
  });

  return routes;
}
