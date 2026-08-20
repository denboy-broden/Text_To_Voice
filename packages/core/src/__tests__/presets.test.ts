import { describe, it, expect } from "vitest"
import {
  DIALECT_PRESETS,
  VOICES,
  MODEL_REGISTRY,
  getPresetByKey,
  getTTSModels,
  getLLMModels,
  getVoicesForModel,
} from "../presets"

describe("DIALECT_PRESETS", () => {
  it("should contain all 6 preset keys", () => {
    const keys = DIALECT_PRESETS.map((p) => p.key)
    expect(keys).toEqual(["jawa", "sunda", "gaul", "formal", "dongeng", "anime"])
  })

  it("each preset should have required fields", () => {
    for (const preset of DIALECT_PRESETS) {
      expect(preset.key).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.defaultVoice).toBeTruthy()
      expect(preset.customInstruction).toBeTruthy()
      expect(preset.sampleText).toBeTruthy()
    }
  })

  it("each defaultVoice should exist in VOICES", () => {
    const voiceNames = VOICES.map((v) => v.name)
    for (const preset of DIALECT_PRESETS) {
      expect(voiceNames).toContain(preset.defaultVoice)
    }
  })
})

describe("VOICES", () => {
  it("should have 10 voices", () => {
    expect(VOICES).toHaveLength(10)
  })

  it("each voice should have name, gender, description", () => {
    for (const voice of VOICES) {
      expect(typeof voice.name).toBe("string")
      expect(["male", "female"]).toContain(voice.gender)
      expect(typeof voice.description).toBe("string")
    }
  })

  it("should have unique voice names", () => {
    const names = VOICES.map((v) => v.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe("MODEL_REGISTRY", () => {
  it("should contain expected models", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id)
    expect(ids).toContain("gemini-2.5-flash-preview-tts")
    expect(ids).toContain("gemini-3-flash-preview")
    expect(ids).toContain("tts-1")
    expect(ids).toContain("tts-1-hd")
    expect(ids).toContain("gpt-4o-mini-tts")
  })

  it("each model should have valid structure", () => {
    for (const model of MODEL_REGISTRY) {
      expect(typeof model.id).toBe("string")
      expect(typeof model.provider).toBe("string")
      expect(typeof model.displayName).toBe("string")
      expect(["text", "audio", "multimodal"]).toContain(model.modality)
      expect(typeof model.capabilities.tts).toBe("boolean")
      expect(typeof model.capabilities.llm).toBe("boolean")
      expect(typeof model.capabilities.streaming).toBe("boolean")
      expect(typeof model.capabilities.multiSpeaker).toBe("boolean")
      expect(Array.isArray(model.capabilities.voices)).toBe(true)
    }
  })

  it("gemini TTS model should support multiSpeaker", () => {
    const geminiTTS = MODEL_REGISTRY.find((m) => m.id === "gemini-2.5-flash-preview-tts")
    expect(geminiTTS?.capabilities.multiSpeaker).toBe(true)
  })
})

describe("getPresetByKey", () => {
  it("should return preset for valid key", () => {
    const jawa = getPresetByKey("jawa")
    expect(jawa).toBeDefined()
    expect(jawa?.name).toBe("Jawa Medok")
  })

  it("should return undefined for invalid key", () => {
    expect(getPresetByKey("nonexistent")).toBeUndefined()
  })

  it("should find all preset keys", () => {
    for (const preset of DIALECT_PRESETS) {
      expect(getPresetByKey(preset.key)).toBe(preset)
    }
  })
})

describe("getTTSModels", () => {
  it("should return only TTS-capable models", () => {
    const ttsModels = getTTSModels()
    expect(ttsModels.length).toBeGreaterThan(0)
    for (const model of ttsModels) {
      expect(model.capabilities.tts).toBe(true)
    }
  })

  it("should not include LLM-only models", () => {
    const ttsModels = getTTSModels()
    const llmOnly = ttsModels.filter(
      (m) => m.capabilities.llm === false && m.capabilities.tts === true,
    )
    expect(llmOnly.length).toBeGreaterThan(0)
    const geminiFlash3 = ttsModels.find((m) => m.id === "gemini-3-flash-preview")
    expect(geminiFlash3).toBeUndefined()
  })
})

describe("getLLMModels", () => {
  it("should return only LLM-capable models", () => {
    const llmModels = getLLMModels()
    expect(llmModels.length).toBeGreaterThan(0)
    for (const model of llmModels) {
      expect(model.capabilities.llm).toBe(true)
    }
  })

  it("should include gemini-3-flash-preview", () => {
    const llmModels = getLLMModels()
    const gemini3 = llmModels.find((m) => m.id === "gemini-3-flash-preview")
    expect(gemini3).toBeDefined()
  })
})

describe("getVoicesForModel", () => {
  it("should return voices for gemini TTS model", () => {
    const voices = getVoicesForModel("gemini-2.5-flash-preview-tts")
    expect(voices.length).toBe(10)
    expect(voices).toContain("Kore")
    expect(voices).toContain("Puck")
  })

  it("should return empty array for unknown model", () => {
    expect(getVoicesForModel("nonexistent")).toEqual([])
  })

  it("should return empty array for LLM model with no voices", () => {
    expect(getVoicesForModel("gemini-3-flash-preview")).toEqual([])
  })

  it("should return openai voices for tts-1", () => {
    const voices = getVoicesForModel("tts-1")
    expect(voices).toContain("alloy")
    expect(voices).toContain("echo")
    expect(voices).toHaveLength(10)
  })
})
