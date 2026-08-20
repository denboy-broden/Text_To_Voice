import type { Skill, SkillResult } from "../skills/skill-system";
import type { TTSRequest, TTSResponse, ProviderName } from "../types";

export interface BatchItem {
  text: string;
  voice?: string;
  instructions?: string;
  label?: string;
}

export interface BatchInput {
  provider: ProviderName;
  model: string;
  items: BatchItem[];
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface BatchOutput {
  results: {
    index: number;
    label?: string;
    success: boolean;
    response?: TTSResponse;
    error?: string;
  }[];
  totalDurationMs: number;
  successCount: number;
  failCount: number;
}

export class BatchTTSSkill implements Skill<BatchInput, BatchOutput> {
  readonly name = "batch-tts";
  readonly description =
    "Generate multiple TTS audio in parallel with concurrency control";

  private generateFn: (request: TTSRequest) => Promise<TTSResponse>;

  constructor(
    generateFn: (request: TTSRequest) => Promise<TTSResponse>,
  ) {
    this.generateFn = generateFn;
  }

  async execute(input: BatchInput): Promise<SkillResult<BatchOutput>> {
    const startTime = Date.now();
    const maxConcurrency = input.maxConcurrency ?? 3;

    const results: BatchOutput["results"] = [];

    if (input.parallel) {
      const chunks = this.chunk(input.items, maxConcurrency);

      for (const chunk of chunks) {
        const promises = chunk.map((item, i) => {
          const globalIndex = input.items.indexOf(item);
          return this.processItem(globalIndex, item, input).then((r) => {
            results.push(r);
          });
        });
        await Promise.all(promises);
      }
    } else {
      for (let i = 0; i < input.items.length; i++) {
        const result = await this.processItem(i, input.items[i], input);
        results.push(result);
      }
    }

    results.sort((a, b) => a.index - b.index);

    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      data: {
        results,
        totalDurationMs: Date.now() - startTime,
        successCount,
        failCount: results.length - successCount,
      },
    };
  }

  private async processItem(
    index: number,
    item: BatchItem,
    input: BatchInput,
  ): Promise<BatchOutput["results"][0]> {
    try {
      const response = await this.generateFn({
        text: item.text,
        provider: input.provider,
        model: input.model,
        voice: item.voice,
        instructions: item.instructions,
        format: "wav",
      });

      return {
        index,
        label: item.label,
        success: true,
        response,
      };
    } catch (err) {
      return {
        index,
        label: item.label,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
