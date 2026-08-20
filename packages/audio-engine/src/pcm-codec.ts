import type { AudioMetadata } from "@nusantara/core";

export function base64ToPCM(base64: string): Int16Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export function parseMimeType(mimeType: string): {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
} {
  const rateMatch = mimeType.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

  const channelsMatch = mimeType.match(/channels=(\d+)/);
  const channels = channelsMatch ? parseInt(channelsMatch[1], 10) : 1;

  const bitsMatch = mimeType.match(/bits=(\d+)/);
  const bitsPerSample = bitsMatch ? parseInt(bitsMatch[1], 10) : 16;

  return { sampleRate, channels, bitsPerSample };
}

export function getWaveformData(
  pcm16Data: Int16Array,
  numPoints: number = 200,
): number[] {
  const step = Math.max(1, Math.floor(pcm16Data.length / numPoints));
  const waveformData: number[] = [];

  for (let i = 0; i < pcm16Data.length; i += step) {
    waveformData.push(pcm16Data[i] / 32768.0);
  }

  return waveformData;
}
