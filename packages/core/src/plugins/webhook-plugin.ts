import type { Plugin, PluginContext } from "../plugins/plugin-system";

export interface WebhookPluginConfig {
  url: string;
  secret?: string;
  events?: string[];
}

export class WebhookPlugin implements Plugin {
  readonly name = "webhook";
  readonly version = "1.0.0";
  readonly hooks = ["after:tts" as const, "after:llm" as const, "error" as const];

  private url: string;
  private secret: string | undefined;
  private events: string[];

  constructor(config: WebhookPluginConfig) {
    this.url = config.url;
    this.secret = config.secret;
    this.events = config.events ?? ["after:tts", "after:llm", "error"];
  }

  async execute(context: PluginContext): Promise<PluginContext> {
    if (!this.events.includes(context.hook)) {
      return context;
    }

    const payload = {
      event: context.hook,
      timestamp: new Date().toISOString(),
      data: {
        provider: context.response?.provider ?? context.request?.provider,
        model: context.response?.model ?? context.request?.model,
        durationMs: context.response?.duration,
        error: context.error?.message,
        metadata: context.metadata,
      },
    };

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.secret) {
        const body = JSON.stringify(payload);
        const encoder = new TextEncoder();
        const keyData = encoder.encode(this.secret);
        const data = encoder.encode(body);

        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );

        const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
        const sigArray = new Uint8Array(signature);
        const sigHex = Array.from(sigArray)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        headers["X-Webhook-Signature"] = `sha256=${sigHex}`;
      }

      await fetch(this.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Silent fail — webhook errors should not block main flow
    }

    return context;
  }
}
