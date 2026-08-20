import { describe, it, expect, vi } from "vitest"
import { TTSEngine } from "../tts-engine"
import type { TTSProviderAdapter } from "../tts-engine"
import type { TTSRequest, TTSResponse, MultiSpeakerTTSRequest } from "@nusantara/core"

function createMockAdapter(overrides?: Partial<TTSProviderAdapter>): TTSProviderAdapter {
  return {
    name: "openai",
    async generateTTS(request: TTSRequest): Promise<TTSResponse> {
      return {
        audio: new ArrayBuffer(request.text.length * 10),
        mimeType: "audio/wav",
        format: "wav",
        provider: "openai",
        model: request.model,
        duration: request.text.length * 0.05,
        usage: { characters: request.text.length },
      }
    },
    ...overrides,
  }
}

function createMultiSpeakerAdapter(): TTSProviderAdapter {
  return {
    name: "gemini",
    async generateTTS(request: TTSRequest): Promise<TTSResponse> {
      return {
        audio: new ArrayBuffer(100),
        mimeType: "audio/wav",
        format: "wav",
        provider: "gemini",
        model: request.model,
      }
    },
    async generateMultiSpeaker(request: MultiSpeakerTTSRequest): Promise<TTSResponse> {
      return {
        audio: new ArrayBuffer(request.dialogue.length * 20),
        mimeType: "audio/wav",
        format: "wav",
        provider: "gemini",
        model: request.model,
        duration: request.dialogue.length * 0.1,
      }
    },
  }
}

describe("TTSEngine", () => {
  it("should register and list providers", () => {
    const engine = new TTSEngine()
    engine.registerProvider("openai", createMockAdapter())

    expect(engine.getRegisteredProviders()).toEqual(["openai"])
  })

  it("should register multiple providers", () => {
    const engine = new TTSEngine()
    engine.registerProvider("openai", createMockAdapter({ name: "openai" }))
    engine.registerProvider("gemini", createMockAdapter({ name: "gemini" }))

    const providers = engine.getRegisteredProviders()
    expect(providers).toContain("openai")
    expect(providers).toContain("gemini")
  })

  it("should throw when generating with unregistered provider", async () => {
    const engine = new TTSEngine()

    await expect(
      engine.generate({
        text: "Hello",
        provider: "openai",
        model: "tts-1",
      }),
    ).rejects.toThrow('Provider "openai" not registered')
  })
})

describe("TTSEngine generate", () => {
  it("should call adapter generateTTS with correct request", async () => {
    const generateSpy = vi.fn().mockResolvedValue({
      audio: new ArrayBuffer(100),
      mimeType: "audio/wav",
      format: "wav" as const,
      provider: "openai",
      model: "tts-1",
    })

    const adapter = createMockAdapter({ generateTTS: generateSpy })
    const engine = new TTSEngine()
    engine.registerProvider("openai", adapter)

    const request: TTSRequest = {
      text: "Hello world",
      provider: "openai",
      model: "tts-1",
      voice: "alloy",
      instructions: "Speak clearly",
    }

    const response = await engine.generate(request)

    expect(generateSpy).toHaveBeenCalledWith(request)
    expect(response.audio).toBeInstanceOf(ArrayBuffer)
    expect(response.mimeType).toBe("audio/wav")
  })

  it("should propagate errors from adapter", async () => {
    const adapter = createMockAdapter({
      generateTTS: vi.fn().mockRejectedValue(new Error("API rate limit")),
    })
    const engine = new TTSEngine()
    engine.registerProvider("openai", adapter)

    await expect(
      engine.generate({
        text: "Hello",
        provider: "openai",
        model: "tts-1",
      }),
    ).rejects.toThrow("API rate limit")
  })

  it("should handle all request fields", async () => {
    const generateSpy = vi.fn().mockResolvedValue({
      audio: new ArrayBuffer(0),
      mimeType: "audio/wav",
      format: "wav" as const,
      provider: "openai",
      model: "tts-1-hd",
    })

    const adapter = createMockAdapter({ generateTTS: generateSpy })
    const engine = new TTSEngine()
    engine.registerProvider("openai", adapter)

    await engine.generate({
      text: "Test",
      provider: "openai",
      model: "tts-1-hd",
      voice: "echo",
      language: "id",
      speed: 1.2,
      emotion: "happy",
      format: "wav",
      metadata: { sessionId: "abc" },
    })

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        voice: "echo",
        language: "id",
        speed: 1.2,
        emotion: "happy",
      }),
    )
  })
})

describe("TTSEngine generateMultiSpeaker", () => {
  it("should throw for unregistered provider", async () => {
    const engine = new TTSEngine()

    await expect(
      engine.generateMultiSpeaker({
        dialogue: "Hello",
        provider: "gemini",
        model: "gemini-2.5-flash-preview-tts",
        speakers: [{ speaker: "narrator", voice: "Kore" }],
      }),
    ).rejects.toThrow('Provider "gemini" not registered')
  })

  it("should throw when provider lacks multiSpeaker support", async () => {
    const engine = new TTSEngine()
    engine.registerProvider("openai", createMockAdapter())

    await expect(
      engine.generateMultiSpeaker({
        dialogue: "Hello",
        provider: "openai",
        model: "tts-1",
        speakers: [{ speaker: "narrator", voice: "alloy" }],
      }),
    ).rejects.toThrow("does not support multi-speaker TTS")
  })

  it("should call adapter generateMultiSpeaker when available", async () => {
    const multiSpeakerSpy = vi.fn().mockResolvedValue({
      audio: new ArrayBuffer(200),
      mimeType: "audio/wav",
      format: "wav" as const,
      provider: "gemini",
      model: "gemini-2.5-flash-preview-tts",
    })

    const adapter: TTSProviderAdapter = {
      name: "gemini",
      async generateTTS(): Promise<TTSResponse> {
        throw new Error("not implemented")
      },
      generateMultiSpeaker: multiSpeakerSpy,
    }

    const engine = new TTSEngine()
    engine.registerProvider("gemini", adapter)

    const request: MultiSpeakerTTSRequest = {
      dialogue: "Selamat pagi semua!",
      provider: "gemini",
      model: "gemini-2.5-flash-preview-tts",
      speakers: [
        { speaker: "narrator", voice: "Kore" },
        { speaker: "friend", voice: "Puck" },
      ],
    }

    const response = await engine.generateMultiSpeaker(request)

    expect(multiSpeakerSpy).toHaveBeenCalledWith(request)
    expect(response.audio).toBeInstanceOf(ArrayBuffer)
  })

  it("should work with adapter that has both single and multi-speaker", async () => {
    const adapter = createMultiSpeakerAdapter()
    const engine = new TTSEngine()
    engine.registerProvider("gemini", adapter)

    const singleResult = await engine.generate({
      text: "Hello",
      provider: "gemini",
      model: "gemini-2.5-flash-preview-tts",
    })
    expect(singleResult.audio).toBeInstanceOf(ArrayBuffer)

    const multiResult = await engine.generateMultiSpeaker({
      dialogue: "Hello",
      provider: "gemini",
      model: "gemini-2.5-flash-preview-tts",
      speakers: [{ speaker: "narrator", voice: "Kore" }],
    })
    expect(multiResult.audio).toBeInstanceOf(ArrayBuffer)
  })
})
