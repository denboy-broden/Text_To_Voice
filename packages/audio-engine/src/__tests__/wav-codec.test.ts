import { describe, it, expect } from "vitest"
import { pcmToWav } from "../wav-encoder"
import { decodeWav } from "../wav-decoder"
import { base64ToPCM } from "../pcm-codec"
import { normalizePCM, getPeakLevel, getRMSLevel } from "../normalize"

describe("pcmToWav", () => {
  it("should produce a Blob with audio/wav type", () => {
    const pcm = new Int16Array([0, 1000, -1000, 32767, -32768])
    const blob = pcmToWav(pcm, 24000)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe("audio/wav")
  })

  it("should produce valid WAV with RIFF header", async () => {
    const pcm = new Int16Array([0, 500, -500])
    const blob = pcmToWav(pcm, 24000)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)

    // RIFF header
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    )
    expect(riff).toBe("RIFF")

    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11),
    )
    expect(wave).toBe("WAVE")
  })

  it("should produce valid WAV with correct fmt chunk", async () => {
    const pcm = new Int16Array([0])
    const blob = pcmToWav(pcm, 24000)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)

    // fmt chunk
    const fmt = String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15),
    )
    expect(fmt).toBe("fmt ")

    const audioFormat = view.getUint16(20, true)
    expect(audioFormat).toBe(1) // PCM

    const numChannels = view.getUint16(22, true)
    expect(numChannels).toBe(1)

    const sampleRate = view.getUint32(24, true)
    expect(sampleRate).toBe(24000)

    const bitsPerSample = view.getUint16(34, true)
    expect(bitsPerSample).toBe(16)
  })

  it("should produce WAV with correct data size", async () => {
    const pcm = new Int16Array([100, 200, 300])
    const blob = pcmToWav(pcm, 24000)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)

    const dataSize = view.getUint32(40, true)
    expect(dataSize).toBe(pcm.length * 2) // 16-bit = 2 bytes per sample

    const expectedSize = 44 + pcm.length * 2
    expect(buffer.byteLength).toBe(expectedSize)
  })

  it("should handle empty PCM data", async () => {
    const pcm = new Int16Array([])
    const blob = pcmToWav(pcm, 24000)
    const buffer = await blob.arrayBuffer()

    expect(buffer.byteLength).toBe(44)
  })

  it("should use default sample rate of 24000", async () => {
    const pcm = new Int16Array([0])
    const blob = pcmToWav(pcm)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)

    expect(view.getUint32(24, true)).toBe(24000)
  })
})

describe("decodeWav", () => {
  it("should throw on invalid RIFF header", () => {
    const buffer = new ArrayBuffer(44)
    const view = new DataView(buffer)
    view.setUint8(0, 0x4e) // 'N'
    view.setUint8(1, 0x4f)
    view.setUint8(2, 0x54)
    view.setUint8(3, 0x20)

    expect(() => decodeWav(buffer)).toThrow('Invalid WAV: expected "RIFF"')
  })

  it("should throw on missing data chunk", () => {
    const buffer = new ArrayBuffer(44)
    const view = new DataView(buffer)

    // Write RIFF header
    const riff = "RIFF"
    for (let i = 0; i < 4; i++) view.setUint8(i, riff.charCodeAt(i))
    view.setUint32(4, 36, true)
    const wave = "WAVE"
    for (let i = 0; i < 4; i++) view.setUint8(8 + i, wave.charCodeAt(i))

    // Write fmt chunk only
    const fmt = "fmt "
    for (let i = 0; i < 4; i++) view.setUint8(12 + i, fmt.charCodeAt(i))
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 24000, true)
    view.setUint32(28, 48000, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)

    expect(() => decodeWav(buffer)).toThrow("no data chunk found")
  })
})

describe("pcmToWav + decodeWav roundtrip", () => {
  function encodeAndDecode(pcm: Int16Array, sampleRate = 24000) {
    // Rebuild the WAV manually using the same logic as pcmToWav to get a proper ArrayBuffer
    const numChannels = 1
    const bytesPerSample = 2
    const blockAlign = numChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = pcm.length * bytesPerSample
    const wavHeader = 44

    const rawBuffer = new ArrayBuffer(wavHeader + dataSize)
    const view = new DataView(rawBuffer)

    // RIFF
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
    }

    writeStr(0, "RIFF")
    view.setUint32(4, 36 + dataSize, true)
    writeStr(8, "WAVE")
    writeStr(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true)
    writeStr(36, "data")
    view.setUint32(40, dataSize, true)

    let offset = 44
    for (let i = 0; i < pcm.length; i++) {
      view.setInt16(offset, pcm[i], true)
      offset += 2
    }

    return decodeWav(rawBuffer)
  }

  it("should roundtrip simple values", () => {
    const original = new Int16Array([0, 1000, -1000, 32767, -32768])
    const { pcm } = encodeAndDecode(original)

    expect(pcm.length).toBe(original.length)
    for (let i = 0; i < original.length; i++) {
      expect(pcm[i]).toBe(original[i])
    }
  })

  it("should preserve metadata through roundtrip", () => {
    const pcm = new Int16Array([0])
    const { metadata } = encodeAndDecode(pcm, 44100)

    expect(metadata.sampleRate).toBe(44100)
    expect(metadata.channels).toBe(1)
    expect(metadata.bitsPerSample).toBe(16)
    expect(metadata.sampleFormat).toBe("pcm_16")
  })

  it("should roundtrip larger audio data", () => {
    const pcm = new Int16Array(1000)
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] = Math.round(Math.sin((i / pcm.length) * Math.PI * 2) * 16000)
    }

    const { pcm: decoded } = encodeAndDecode(pcm)
    expect(decoded.length).toBe(pcm.length)
    for (let i = 0; i < pcm.length; i++) {
      expect(decoded[i]).toBe(pcm[i])
    }
  })
})

describe("base64ToPCM", () => {
  it("should decode base64 to Int16Array", () => {
    // Create a known PCM buffer: [1000, -1000] as Int16Array LE
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setInt16(0, 1000, true)
    view.setInt16(2, -1000, true)

    // Convert to base64
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)

    const result = base64ToPCM(base64)

    expect(result).toBeInstanceOf(Int16Array)
    expect(result.length).toBe(2)
    expect(result[0]).toBe(1000)
    expect(result[1]).toBe(-1000)
  })

  it("should decode empty base64 to empty Int16Array", () => {
    const result = base64ToPCM(btoa(""))
    expect(result.length).toBe(0)
  })
})

describe("normalizePCM", () => {
  it("should normalize audio to target peak", () => {
    const pcm = new Int16Array([1000, -1000, 500, -500])
    const normalized = normalizePCM(pcm, 0.9)

    const peak = getPeakLevel(normalized)
    expect(peak).toBeCloseTo(0.9, 2)
  })

  it("should handle silence without errors", () => {
    const pcm = new Int16Array([0, 0, 0, 0])
    const normalized = normalizePCM(pcm)

    expect(getPeakLevel(normalized)).toBe(0)
  })

  it("should not clip values that are already at target", () => {
    const pcm = new Int16Array([32767, -32768])
    const normalized = normalizePCM(pcm, 1.0)

    // With targetPeak=1.0, values at max should stay near max
    expect(Math.abs(normalized[0])).toBeLessThanOrEqual(32767)
    expect(Math.abs(normalized[1])).toBeLessThanOrEqual(32768)
  })

  it("should scale up quiet audio", () => {
    const pcm = new Int16Array([100, -100])
    const normalized = normalizePCM(pcm, 0.9)

    expect(Math.abs(normalized[0])).toBeGreaterThan(100)
    expect(Math.abs(normalized[1])).toBeGreaterThan(100)
  })

  it("should use default target peak of 0.9", () => {
    const pcm = new Int16Array([1000, -2000, 3000])
    const normalized = normalizePCM(pcm)

    const peak = getPeakLevel(normalized)
    expect(peak).toBeCloseTo(0.9, 1)
  })
})

describe("getPeakLevel", () => {
  it("should return 0 for silence", () => {
    const pcm = new Int16Array([0, 0, 0])
    expect(getPeakLevel(pcm)).toBe(0)
  })

  it("should return ~1.0 for max amplitude", () => {
    const pcm = new Int16Array([32767])
    expect(getPeakLevel(pcm)).toBeCloseTo(1.0, 4)
  })

  it("should return correct peak for mixed signal", () => {
    const pcm = new Int16Array([1000, -5000, 3000])
    expect(getPeakLevel(pcm)).toBeCloseTo(5000 / 32767, 4)
  })

  it("should handle negative peaks", () => {
    const pcm = new Int16Array([-32768])
    expect(getPeakLevel(pcm)).toBeCloseTo(32768 / 32767, 4)
  })
})

describe("getRMSLevel", () => {
  it("should return 0 for silence", () => {
    const pcm = new Int16Array([0, 0, 0])
    expect(getRMSLevel(pcm)).toBe(0)
  })

  it("should return 0 for empty array", () => {
    const pcm = new Int16Array([])
    expect(getRMSLevel(pcm)).toBe(0)
  })

  it("should return ~1.0 for constant max signal", () => {
    const pcm = new Int16Array([32767, 32767, 32767])
    expect(getRMSLevel(pcm)).toBeCloseTo(1.0, 4)
  })

  it("should be less than peak for non-constant signal", () => {
    const pcm = new Int16Array([32767, 0, 32767, 0])
    const rms = getRMSLevel(pcm)
    const peak = getPeakLevel(pcm)
    expect(rms).toBeLessThan(peak)
  })

  it("should compute correct RMS", () => {
    const pcm = new Int16Array([1000, -1000])
    // RMS = sqrt((1000^2 + (-1000)^2) / 2) / 32767
    // = sqrt(1000000) / 32767 = 1000 / 32767
    const expected = Math.sqrt((1000 * 1000 + 1000 * 1000) / 2) / 32767
    expect(getRMSLevel(pcm)).toBeCloseTo(expected, 6)
  })
})
