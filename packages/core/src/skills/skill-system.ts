import type { TTSRequest, TTSResponse } from "../types";

// ============================================================
// Skill Types
// ============================================================

export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs?: number;
}

export interface Skill<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;

  execute(input: TInput): Promise<SkillResult<TOutput>>;
}

// ============================================================
// Skill Registry
// ============================================================

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
  }

  unregister(name: string): void {
    this.skills.delete(name);
  }

  get<TInput, TOutput>(name: string): Skill<TInput, TOutput> | undefined {
    return this.skills.get(name) as Skill<TInput, TOutput> | undefined;
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  async run<TInput, TOutput>(
    name: string,
    input: TInput,
  ): Promise<SkillResult<TOutput>> {
    const skill = this.get<TInput, TOutput>(name);
    if (!skill) {
      return { success: false, error: `Skill "${name}" not found` };
    }

    const start = Date.now();
    try {
      const result = await skill.execute(input);
      result.durationMs = Date.now() - start;
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
        durationMs: Date.now() - start,
      };
    }
  }
}

export const skillRegistry = new SkillRegistry();
