import { describe, it, expect, beforeEach, vi } from "vitest"
import { PluginRegistry } from "../plugins/plugin-system"
import type { Plugin, PluginContext } from "../plugins/plugin-system"
import { AudioCachePlugin } from "../plugins/audio-cache-plugin"
import type { TTSRequest, TTSResponse } from "../../types"

function createMockPlugin(
  name: string,
  hooks: Plugin["hooks"],
  executeFn?: (ctx: PluginContext) => Promise<PluginContext>,
): Plugin {
  return {
    name,
    version: "1.0.0",
    hooks,
    execute:
      executeFn ??
      (async (ctx) => {
        ctx.metadata[name] = true
        return ctx
      }),
  }
}

function makeTTSRequest(overrides?: Partial<TTSRequest>): TTSRequest {
  return {
    text: "Hello world",
    provider: "openai",
    model: "tts-1",
    voice: "alloy",
    ...overrides,
  }
}

function makeTTSResponse(overrides?: Partial<TTSResponse>): TTSResponse {
  return {
    audio: new ArrayBuffer(100),
    mimeType: "audio/wav",
    format: "wav",
    provider: "openai",
    model: "tts-1",
    ...overrides,
  }
}

describe("PluginRegistry", () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry()
  })

  it("should register and retrieve a plugin", () => {
    const plugin = createMockPlugin("test-plugin", ["before:tts"])
    registry.register(plugin)

    expect(registry.get("test-plugin")).toBe(plugin)
    expect(registry.list()).toHaveLength(1)
  })

  it("should unregister a plugin", () => {
    const plugin = createMockPlugin("test-plugin", ["before:tts"])
    registry.register(plugin)
    registry.unregister("test-plugin")

    expect(registry.get("test-plugin")).toBeUndefined()
    expect(registry.list()).toHaveLength(0)
  })

  it("should handle unregister of non-existent plugin gracefully", () => {
    registry.unregister("nonexistent")
    expect(registry.list()).toHaveLength(0)
  })

  it("should register multiple plugins", () => {
    registry.register(createMockPlugin("plugin-a", ["before:tts"]))
    registry.register(createMockPlugin("plugin-b", ["after:tts"]))

    expect(registry.list()).toHaveLength(2)
  })

  it("should overwrite plugin with same name", () => {
    const v1 = createMockPlugin("same-name", ["before:tts"])
    const v2 = createMockPlugin("same-name", ["after:tts"])
    registry.register(v1)
    registry.register(v2)

    expect(registry.list()).toHaveLength(1)
    expect(registry.get("same-name")).toBe(v2)
  })

  it("should execute hook on registered plugins in order", async () => {
    const order: string[] = []

    registry.register(
      createMockPlugin("first", ["before:tts"], async (ctx) => {
        order.push("first")
        return ctx
      }),
    )
    registry.register(
      createMockPlugin("second", ["before:tts"], async (ctx) => {
        order.push("second")
        return ctx
      }),
    )

    const context: PluginContext = {
      hook: "before:tts",
      request: makeTTSRequest(),
      metadata: {},
    }

    await registry.runHook("before:tts", context)
    expect(order).toEqual(["first", "second"])
  })

  it("should not run plugins for unmatched hooks", async () => {
    const called: string[] = []

    registry.register(
      createMockPlugin("tts-only", ["before:tts"], async (ctx) => {
        called.push("tts-only")
        return ctx
      }),
    )
    registry.register(
      createMockPlugin("llm-only", ["before:llm"], async (ctx) => {
        called.push("llm-only")
        return ctx
      }),
    )

    const context: PluginContext = {
      hook: "before:tts",
      request: makeTTSRequest(),
      metadata: {},
    }

    await registry.runHook("before:tts", context)
    expect(called).toEqual(["tts-only"])
  })

  it("should propagate context modifications between plugins", async () => {
    registry.register(
      createMockPlugin("modifier", ["after:tts"], async (ctx) => {
        ctx.metadata.modified = true
        return ctx
      }),
    )

    const context: PluginContext = {
      hook: "after:tts",
      request: makeTTSRequest(),
      response: makeTTSResponse(),
      metadata: {},
    }

    const result = await registry.runHook("after:tts", context)
    expect(result.metadata.modified).toBe(true)
  })

  it("should handle async onInit and onDestroy", async () => {
    const initOrder: string[] = []

    const plugin: Plugin = {
      name: "lifecycle",
      version: "1.0.0",
      hooks: ["before:tts"],
      async onInit() {
        initOrder.push("init")
      },
      async onDestroy() {
        initOrder.push("destroy")
      },
      async execute(ctx) {
        return ctx
      },
    }

    registry.register(plugin)
    await registry.initializeAll()
    expect(initOrder).toEqual(["init"])

    await registry.destroyAll()
    expect(initOrder).toEqual(["init", "destroy"])
  })

  it("should handle multiple plugins for different hooks", async () => {
    const executed: string[] = []

    registry.register(
      createMockPlugin("multi-a", ["before:tts", "after:tts"], async (ctx) => {
        executed.push(`${ctx.hook}:multi-a`)
        return ctx
      }),
    )
    registry.register(
      createMockPlugin("multi-b", ["after:tts"], async (ctx) => {
        executed.push(`${ctx.hook}:multi-b`)
        return ctx
      }),
    )

    const context: PluginContext = {
      hook: "after:tts",
      request: makeTTSRequest(),
      response: makeTTSResponse(),
      metadata: {},
    }

    await registry.runHook("after:tts", context)
    expect(executed).toEqual(["after:tts:multi-a", "after:tts:multi-b"])
  })
})

describe("AudioCachePlugin", () => {
  let cache: AudioCachePlugin

  beforeEach(() => {
    cache = new AudioCachePlugin({ maxSize: 5, ttlMs: 60000 })
  })

  it("should have correct plugin metadata", () => {
    expect(cache.name).toBe("audio-cache")
    expect(cache.version).toBe("1.0.0")
    expect(cache.hooks).toEqual(["after:tts"])
  })

  it("should cache response on after:tts hook", async () => {
    const request = makeTTSRequest()
    const response = makeTTSResponse()

    const context: PluginContext = {
      hook: "after:tts",
      request,
      response,
      metadata: {},
    }

    const result = await cache.execute(context)
    expect(result.metadata.cached).toBe(false)
    expect(result.response).toBe(response)
  })

  it("should return cached response on cache hit", async () => {
    const request = makeTTSRequest()
    const originalResponse = makeTTSResponse()
    const newResponse = makeTTSResponse()

    const context1: PluginContext = {
      hook: "after:tts",
      request,
      response: originalResponse,
      metadata: {},
    }
    await cache.execute(context1)

    const context2: PluginContext = {
      hook: "after:tts",
      request,
      response: newResponse,
      metadata: {},
    }

    const result = await cache.execute(context2)
    expect(result.metadata.cached).toBe(true)
    expect(result.response).toBe(originalResponse)
  })

  it("should use lookup to find cached entries", () => {
    const request = makeTTSRequest()
    expect(cache.lookup(request)).toBeNull()

    const context: PluginContext = {
      hook: "after:tts",
      request,
      response: makeTTSResponse(),
      metadata: {},
    }
    cache.execute(context)

    const cached = cache.lookup(request)
    expect(cached).not.toBeNull()
  })

  it("should track cache stats", async () => {
    const request = makeTTSRequest()

    const context: PluginContext = {
      hook: "after:tts",
      request,
      response: makeTTSResponse(),
      metadata: {},
    }
    await cache.execute(context)

    let stats = cache.getStats()
    expect(stats.size).toBe(1)
    expect(stats.hits).toBe(0)

    cache.lookup(request)
    stats = cache.getStats()
    expect(stats.hits).toBe(1)
  })

  it("should clear cache", async () => {
    const request = makeTTSRequest()
    const context: PluginContext = {
      hook: "after:tts",
      request,
      response: makeTTSResponse(),
      metadata: {},
    }
    await cache.execute(context)

    cache.clear()
    expect(cache.getStats().size).toBe(0)
    expect(cache.lookup(request)).toBeNull()
  })

  it("should evict oldest entries when max size exceeded", async () => {
    for (let i = 0; i < 6; i++) {
      const context: PluginContext = {
        hook: "after:tts",
        request: makeTTSRequest({ text: `text-${i}` }),
        response: makeTTSResponse(),
        metadata: {},
      }
      await cache.execute(context)
    }

    expect(cache.getStats().size).toBe(5)
    expect(cache.lookup(makeTTSRequest({ text: "text-0" }))).toBeNull()
  })

  it("should not affect context on non-after:tts hook", async () => {
    const context: PluginContext = {
      hook: "before:tts",
      request: makeTTSRequest(),
      metadata: {},
    }

    const result = await cache.execute(context)
    expect(result.metadata.cached).toBeUndefined()
  })

  it("should return cached TTL as null after expiry", async () => {
    vi.useFakeTimers({ now: 1000 })
    const shortCache = new AudioCachePlugin({ ttlMs: 500 })
    const request = makeTTSRequest()

    const context: PluginContext = {
      hook: "after:tts",
      request,
      response: makeTTSResponse(),
      metadata: {},
    }
    await shortCache.execute(context)

    // Still within TTL
    expect(shortCache.lookup(request)).not.toBeNull()

    // Advance past TTL
    vi.advanceTimersByTime(600)

    const cached = shortCache.lookup(request)
    expect(cached).toBeNull()

    vi.useRealTimers()
  })
})
