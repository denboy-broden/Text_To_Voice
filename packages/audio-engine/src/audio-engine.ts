import type { AudioMetadata } from "@nusantara/core";
import { decodeWav, extractMetadata } from "./wav-decoder";
import { pcmToWav } from "./wav-encoder";
import { base64ToPCM, parseMimeType, getWaveformData } from "./pcm-codec";
import { normalizePCM, getPeakLevel, getRMSLevel } from "./normalize";

export class AudioEngine {
  decodeWav(wavData: ArrayBuffer): { pcm: Int16Array; metadata: AudioMetadata } {
    return decodeWav(wavData);
  }

  extractMetadata(wavData: ArrayBuffer): AudioMetadata {
    return extractMetadata(wavData);
  }

  pcmToWav(pcm16Data: Int16Array, sampleRate: number = 24000): Blob {
    return pcmToWav(pcm16Data, sampleRate);
  }

  base64ToPCM(base64: string): Int16Array {
    return base64ToPCM(base64);
  }

  parseMimeType(mimeType: string): {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
  } {
    return parseMimeType(mimeType);
  }

  getWaveformData(pcm16Data: Int16Array, numPoints: number = 200): number[] {
    return getWaveformData(pcm16Data, numPoints);
  }

  normalizePCM(pcm: Int16Array, targetPeak: number = 0.9): Int16Array {
    return normalizePCM(pcm, targetPeak);
  }

  getPeakLevel(pcm: Int16Array): number {
    return getPeakLevel(pcm);
  }

  getRMSLevel(pcm: Int16Array): number {
    return getRMSLevel(pcm);
  }

  getDuration(pcm: Int16Array, sampleRate: number): number {
    return pcm.length / sampleRate;
  }
}

export const audioEngine = new AudioEngine();
