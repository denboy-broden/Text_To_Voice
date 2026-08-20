import type { TTSRequest, TTSResponse } from "../types";

// ============================================================
// Plugin Types
// ============================================================

export type PluginHook =
  | "before:tts"
  | "after:tts"
  | "before:llm"
  | "after:llm"
  | "error";

export interface PluginContext {
  hook: PluginHook;
  request?: TTSRequest;
  response?: TTSResponse;
  error?: Error;
  metadata: Record<string, unknown>;
}

export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly hooks: PluginHook[];

  onInit?(): Promise<void> | void;
  onDestroy?(): Promise<void> | void;
  execute(context: PluginContext): Promise<PluginContext>;
}

// ============================================================
// Plugin Registry
// ============================================================

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private hookOrder: Map<PluginHook, string[]> = new Map();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);

    for (const hook of plugin.hooks) {
      const existing = this.hookOrder.get(hook) ?? [];
      existing.push(plugin.name);
      this.hookOrder.set(hook, existing);
    }
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    for (const hook of plugin.hooks) {
      const list = this.hookOrder.get(hook) ?? [];
      this.hookOrder.set(
        hook,
        list.filter((n) => n !== name),
      );
    }

    this.plugins.delete(name);
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  async runHook(
    hook: PluginHook,
    context: PluginContext,
  ): Promise<PluginContext> {
    const pluginNames = this.hookOrder.get(hook) ?? [];
    let current = { ...context };

    for (const name of pluginNames) {
      const plugin = this.plugins.get(name);
      if (!plugin) continue;
      current = await plugin.execute(current);
    }

    return current;
  }

  async initializeAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onInit) {
        await plugin.onInit();
      }
    }
  }

  async destroyAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onDestroy) {
        await plugin.onDestroy();
      }
    }
  }
}

export const pluginRegistry = new PluginRegistry();
