import type { Plugin, PluginContext } from "../plugins/plugin-system";
import type { TTSRequest, TTSResponse } from "../types";

interface CacheEntry {
  response: TTSResponse;
  timestamp: number;
  hits: number;
}

export interface AudioCachePluginConfig {
  maxSize?: number;
  ttlMs?: number;
}

export class AudioCachePlugin implements Plugin {
  readonly name = "audio-cache";
  readonly version = "1.0.0";
  readonly hooks = ["after:tts" as const];

  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttlMs: number;

  constructor(config: AudioCachePluginConfig = {}) {
    this.maxSize = config.maxSize ?? 100;
    this.ttlMs = config.ttlMs ?? 30 * 60 * 1000;
  }

  onInit(): void {
    console.log(
      `[audio-cache] Initialized (maxSize=${this.maxSize}, ttl=${this.ttlMs}ms)`,
    );
  }

  onDestroy(): void {
    this.cache.clear();
    console.log("[audio-cache] Cleared");
  }

  async execute(context: PluginContext): Promise<PluginContext> {
    if (context.hook === "after:tts" && context.response && context.request) {
      const key = this.buildKey(context.request);
      const existing = this.cache.get(key);

      if (existing) {
        existing.hits++;
        context.metadata.cached = true;
        context.metadata.cacheHits = existing.hits;
        context.response = existing.response;
        return context;
      }

      this.cache.set(key, {
        response: context.response,
        timestamp: Date.now(),
        hits: 0,
      });

      this.evict();
      context.metadata.cached = false;
    }

    return context;
  }

  lookup(request: TTSRequest): TTSResponse | null {
    const key = this.buildKey(request);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.response;
  }

  getStats(): { size: number; hits: number; misses: number } {
    let hits = 0;
    for (const entry of this.cache.values()) {
      hits += entry.hits;
    }
    return { size: this.cache.size, hits, misses: 0 };
  }

  clear(): void {
    this.cache.clear();
  }

  private buildKey(request: TTSRequest): string {
    return [
      request.provider,
      request.model,
      request.voice ?? "",
      request.text.slice(0, 100),
      request.instructions ?? "",
    ].join(":");
  }

  private evict(): void {
    if (this.cache.size <= this.maxSize) return;

    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    const toRemove = entries.slice(0, entries.length - this.maxSize);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }
}
