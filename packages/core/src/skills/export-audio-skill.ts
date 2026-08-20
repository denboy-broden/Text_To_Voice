import type { Skill, SkillResult } from "../skills/skill-system";
import type { TTSResponse } from "../types";

export interface ExportInput {
  responses: TTSResponse[];
  format: "zip" | "individual";
  prefix?: string;
}

export interface ExportOutput {
  files: {
    name: string;
    size: number;
    blob: Blob;
  }[];
  totalSize: number;
}

export class ExportAudioSkill implements Skill<ExportInput, ExportOutput> {
  readonly name = "export-audio";
  readonly description =
    "Package multiple TTS responses into downloadable files";

  async execute(input: ExportInput): Promise<SkillResult<ExportOutput>> {
    const prefix = input.prefix ?? "nusantara-voice";
    const files: ExportOutput["files"] = [];

    for (let i = 0; i < input.responses.length; i++) {
      const res = input.responses[i];
      const ext = res.format ?? "wav";
      const name = `${prefix}-${i + 1}.${ext}`;

      files.push({
        name,
        size: res.audio.byteLength,
        blob: new Blob([res.audio], { type: res.mimeType }),
      });
    }

    return {
      success: true,
      data: {
        files,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
      },
    };
  }
}
