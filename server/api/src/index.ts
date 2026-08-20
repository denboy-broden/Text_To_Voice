import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { pluginRegistry, AudioCachePlugin } from "@nusantara/core";
import { ttsRoutes } from "./routes/tts";
import { agentRoutes } from "./routes/agent";
import { modelsRoutes } from "./routes/models";
import { pluginRoutes, batchRoutes } from "./routes/plugins";
import { rateLimiter } from "./middleware/rate-limiter";
import { errorHandler } from "./middleware/error-handler";

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
    plugins: pluginRegistry.list().map((p) => p.name),
  });
});

const port = parseInt(process.env.PORT ?? "3001", 10);

console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
