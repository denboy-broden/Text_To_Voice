import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), "../../.env") });
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { pluginRegistry, AudioCachePlugin } from "@nusantara/core";
import {
  GeminiProvider,
  GeminiLLMProvider,
  OpenAIProvider,
  OpenRouterProvider,
  OpenAICompatibleProvider,
  OpenAICompatibleLLMProvider,
  ProviderRegistry,
} from "@nusantara/providers";
import { ttsRoutes } from "./routes/tts";
import { agentRoutes } from "./routes/agent";
import { modelsRoutes } from "./routes/models";
import { pluginRoutes, batchRoutes } from "./routes/plugins";
import { rateLimiter } from "./middleware/rate-limiter";
import { errorHandler } from "./middleware/error-handler";

// ── Provider Registry ────────────────────────────────────────
const registry = new ProviderRegistry();

// Gemini
const geminiKey = process.env.GEMINI_API_KEY ?? "";
if (geminiKey) {
  registry.registerTTS("gemini", new GeminiProvider({ apiKey: geminiKey }));
  registry.registerLLM("gemini", new GeminiLLMProvider({ apiKey: geminiKey }));
  console.log("[providers] Gemini registered");
}

// OpenAI
const openaiKey = process.env.OPENAI_API_KEY ?? "";
if (openaiKey) {
  registry.registerTTS("openai", new OpenAIProvider({ apiKey: openaiKey }));
  console.log("[providers] OpenAI registered");
}

// OpenRouter
const openrouterKey = process.env.OPENROUTER_API_KEY ?? "";
if (openrouterKey) {
  registry.registerTTS(
    "openrouter",
    new OpenRouterProvider({ apiKey: openrouterKey }),
  );
  console.log("[providers] OpenRouter registered");
}

// Custom OpenAI-Compatible Provider (any provider via .env config)
const customKey = process.env.CUSTOM_PROVIDER_API_KEY ?? "";
const customBaseURL = process.env.CUSTOM_PROVIDER_BASE_URL ?? "";
if (customKey && customBaseURL) {
  const customName = (process.env.CUSTOM_PROVIDER_NAME ?? "custom") as any;
  const customTTSModel = process.env.CUSTOM_PROVIDER_TTS_MODEL ?? "tts-1";
  const customLLMModel = process.env.CUSTOM_PROVIDER_LLM_MODEL ?? "gpt-4o-mini";
  const customVoice = process.env.CUSTOM_PROVIDER_DEFAULT_VOICE ?? "alloy";

  registry.registerTTS(
    customName,
    new OpenAICompatibleProvider({
      name: customName,
      apiKey: customKey,
      baseURL: customBaseURL,
      model: customTTSModel,
      defaultVoice: customVoice,
      supportsInstructions: true,
    }),
  );

  registry.registerLLM(
    customName,
    new OpenAICompatibleLLMProvider({
      name: customName,
      apiKey: customKey,
      baseURL: customBaseURL,
      model: customLLMModel,
    }),
  );

  console.log(`[providers] Custom provider "${customName}" registered (${customBaseURL})`);
}

// ── Plugins ──────────────────────────────────────────────────
const audioCache = new AudioCachePlugin({
  maxSize: parseInt(process.env.CACHE_MAX_SIZE ?? "100", 10),
  ttlMs: parseInt(process.env.CACHE_TTL_MS ?? "1800000", 10),
});

pluginRegistry.register(audioCache);

if (process.env.WEBHOOK_URL) {
  const { WebhookPlugin } = require("@nusantara/core");
  pluginRegistry.register(
    new WebhookPlugin({
      url: process.env.WEBHOOK_URL,
      secret: process.env.WEBHOOK_SECRET,
    }),
  );
}

pluginRegistry.initializeAll().then(() => {
  console.log(
    `[plugins] ${pluginRegistry.list().length} plugin(s) initialized`,
  );
});

// ── App ──────────────────────────────────────────────────────
const app = new Hono();

app.onError(errorHandler);

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  }),
);

app.use(
  "/api/tts/*",
  rateLimiter({ windowMs: 60_000, max: 60, keyPrefix: "tts" }),
);
app.use(
  "/api/agent/*",
  rateLimiter({ windowMs: 60_000, max: 30, keyPrefix: "agent" }),
);

app.route("/api/tts", ttsRoutes);
app.route("/api/agent", agentRoutes);
app.route("/api/models", modelsRoutes);
app.route("/api/plugins", pluginRoutes);
app.route("/api/batch", batchRoutes);

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    providers: {
      tts: registry.getTTSProviders(),
      llm: registry.getLLMProviders(),
    },
    plugins: pluginRegistry.list().map((p) => p.name),
  });
});

// ── Start ────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? "3001", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Registered TTS providers: ${registry.getTTSProviders().join(", ")}`);
  console.log(`Registered LLM providers: ${registry.getLLMProviders().join(", ")}`);
});

// Export for route files
export { registry as providerRegistry };
