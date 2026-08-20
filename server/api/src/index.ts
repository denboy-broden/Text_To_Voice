import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), "../../.env") });

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { pluginRegistry, AudioCachePlugin } from "@nusantara/core";
import { ProviderRegistry } from "@nusantara/providers";
import { createTTSRoutes } from "./routes/tts";
import { createAgentRoutes } from "./routes/agent";
import { createModelsRoutes } from "./routes/models";
import { createPluginRoutes, createBatchRoutes } from "./routes/plugins";
import { createProviderConfigRoutes, registerProvidersFromConfig } from "./routes/provider-config";
import { rateLimiter } from "./middleware/rate-limiter";
import { errorHandler } from "./middleware/error-handler";

// ── Provider Registry (single shared instance) ──────────────
const registry = new ProviderRegistry();
export { registry as providerRegistry };

// Load providers from config file
registerProvidersFromConfig(registry);

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

// ── Routes (all receive shared registry) ─────────────────────
app.route("/api/tts", createTTSRoutes(registry));
app.route("/api/agent", createAgentRoutes(registry));
app.route("/api/models", createModelsRoutes(registry));
app.route("/api/plugins", createPluginRoutes(registry));
app.route("/api/batch", createBatchRoutes(registry));
app.route("/api/providers", createProviderConfigRoutes(registry));

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
  console.log(`TTS providers: ${registry.getTTSProviders().join(", ") || "(none)"}`);
  console.log(`LLM providers: ${registry.getLLMProviders().join(", ") || "(none)"}`);
});
