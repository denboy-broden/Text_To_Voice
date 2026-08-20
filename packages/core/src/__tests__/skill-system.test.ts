import { describe, it, expect, beforeEach } from "vitest"
import { SkillRegistry } from "../skills/skill-system"
import type { Skill, SkillResult } from "../skills/skill-system"
import { BatchTTSSkill } from "../skills/batch-tts-skill"
import type { TTSRequest, TTSResponse } from "../../types"

function createMockSkill(name: string, result?: SkillResult): Skill {
  return {
    name,
    description: `Mock skill: ${name}`,
    async execute(): Promise<SkillResult> {
      return result ?? { success: true, data: "done" }
    },
  }
}

function makeMockGenerateFn(): (request: TTSRequest) => Promise<TTSResponse> {
  return async (request: TTSRequest): Promise<TTSResponse> => ({
    audio: new ArrayBuffer(request.text.length * 2),
    mimeType: "audio/wav",
    format: "wav",
    provider: request.provider,
    model: request.model,
    duration: request.text.length * 0.05,
  })
}

describe("SkillRegistry", () => {
  let registry: SkillRegistry

  beforeEach(() => {
    registry = new SkillRegistry()
  })

  it("should register and retrieve a skill", () => {
    const skill = createMockSkill("test-skill")
    registry.register(skill)

    expect(registry.get("test-skill")).toBe(skill)
    expect(registry.list()).toHaveLength(1)
  })

  it("should unregister a skill", () => {
    registry.register(createMockSkill("test-skill"))
    registry.unregister("test-skill")

    expect(registry.get("test-skill")).toBeUndefined()
    expect(registry.list()).toHaveLength(0)
  })

  it("should handle unregister of non-existent skill gracefully", () => {
    registry.unregister("nonexistent")
    expect(registry.list()).toHaveLength(0)
  })

  it("should list multiple registered skills", () => {
    registry.register(createMockSkill("skill-a"))
    registry.register(createMockSkill("skill-b"))
    registry.register(createMockSkill("skill-c"))

    expect(registry.list()).toHaveLength(3)
  })

  it("should run a skill by name and return result", async () => {
    const expectedData = { output: "generated" }
    registry.register(createMockSkill("gen", { success: true, data: expectedData }))

    const result = await registry.run("gen", { input: "hello" })
    expect(result.success).toBe(true)
    expect(result.data).toEqual(expectedData)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("should return error for unknown skill", async () => {
    const result = await registry.run("unknown", null)
    expect(result.success).toBe(false)
    expect(result.error).toContain("not found")
  })

  it("should catch thrown errors in skill execution", async () => {
    const failingSkill: Skill = {
      name: "failing",
      description: "Always fails",
      async execute(): Promise<SkillResult> {
        throw new Error("Intentional failure")
      },
    }

    registry.register(failingSkill)
    const result = await registry.run("failing", null)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Intentional failure")
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("should overwrite skill with same name", () => {
    registry.register(createMockSkill("same", { success: true, data: "v1" }))
    registry.register(createMockSkill("same", { success: true, data: "v2" }))

    expect(registry.list()).toHaveLength(1)
  })
})

describe("BatchTTSSkill", () => {
  it("should have correct metadata", () => {
    const skill = new BatchTTSSkill(makeMockGenerateFn())
    expect(skill.name).toBe("batch-tts")
    expect(skill.description).toBeTruthy()
  })

  it("should process items sequentially by default", async () => {
    const skill = new BatchTTSSkill(makeMockGenerateFn())

    const result = await skill.execute({
      provider: "openai",
      model: "tts-1",
      items: [
        { text: "Hello", voice: "alloy" },
        { text: "World", voice: "echo" },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.results).toHaveLength(2)
    expect(result.data!.successCount).toBe(2)
    expect(result.data!.failCount).toBe(0)
  })

  it("should process items in parallel when specified", async () => {
    const skill = new BatchTTSSkill(makeMockGenerateFn())

    const result = await skill.execute({
      provider: "openai",
      model: "tts-1",
      parallel: true,
      maxConcurrency: 2,
      items: [{ text: "One" }, { text: "Two" }, { text: "Three" }],
    })

    expect(result.success).toBe(true)
    expect(result.data!.results).toHaveLength(3)
    expect(result.data!.successCount).toBe(3)
  })

  it("should handle partial failures", async () => {
    let callCount = 0
    const failingGenerateFn = async (request: TTSRequest): Promise<TTSResponse> => {
      callCount++
      if (callCount === 2) {
        throw new Error("Provider overloaded")
      }
      return {
        audio: new ArrayBuffer(100),
        mimeType: "audio/wav",
        format: "wav",
        provider: request.provider,
        model: request.model,
      }
    }

    const skill = new BatchTTSSkill(failingGenerateFn)

    const result = await skill.execute({
      provider: "openai",
      model: "tts-1",
      items: [{ text: "Success" }, { text: "Fail" }, { text: "Success again" }],
    })

    expect(result.success).toBe(true)
    expect(result.data!.successCount).toBe(2)
    expect(result.data!.failCount).toBe(1)

    const failedItem = result.data!.results.find((r) => !r.success)
    expect(failedItem?.error).toBe("Provider overloaded")
  })

  it("should preserve item labels in results", async () => {
    const skill = new BatchTTSSkill(makeMockGenerateFn())

    const result = await skill.execute({
      provider: "openai",
      model: "tts-1",
      items: [
        { text: "First", label: "intro" },
        { text: "Second", label: "body" },
      ],
    })

    expect(result.data!.results[0].label).toBe("intro")
    expect(result.data!.results[1].label).toBe("body")
  })

  it("should return results sorted by index", async () => {
    const skill = new BatchTTSSkill(makeMockGenerateFn())

    const result = await skill.execute({
      provider: "openai",
      model: "tts-1",
      parallel: true,
      items: [{ text: "C" }, { text: "A" }, { text: "B" }],
    })

    const indices = result.data!.results.map((r) => r.index)
    expect(indices).toEqual([0, 1, 2])
  })

  it("should report total duration", async () => {
    const skill = new BatchTTSSkill(makeMockGenerateFn())

    const result = await skill.execute({
      provider: "openai",
      model: "tts-1",
      items: [{ text: "Hello" }],
    })

    expect(result.data!.totalDurationMs).toBeGreaterThanOrEqual(0)
  })
})
