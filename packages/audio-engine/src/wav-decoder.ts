import type { AudioMetadata } from "@nusantara/core";

interface WAVParseResult {
  pcm: Int16Array;
  metadata: AudioMetadata;
}

export function decodeWav(wavData: ArrayBuffer): WAVParseResult {
  const view = new DataView(wavData);

  const riff = readString(view, 0, 4);
  if (riff !== "RIFF") {
    throw new Error(`Invalid WAV: expected "RIFF", got "${riff}"`);
  }

  const wave = readString(view, 8, 4);
  if (wave !== "WAVE") {
    throw new Error(`Invalid WAV: expected "WAVE", got "${wave}"`);
  }

  let offset = 12;
  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset < view.byteLength - 8) {
    const chunkID = readString(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkID === "fmt ") {
      audioFormat = view.getUint16(offset + 8, true);
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkID === "data") {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) {
      offset++;
    }
  }

  if (dataOffset === -1) {
    throw new Error("Invalid WAV: no data chunk found");
  }

  if (audioFormat !== 1) {
    throw new Error(
      `Unsupported audio format: ${audioFormat} (only PCM=1 is supported)`,
    );
  }

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = dataSize / bytesPerSample;
  const sampleFrameCount = totalSamples / numChannels;

  const pcm = new Int16Array(sampleFrameCount);

  if (bitsPerSample === 16) {
    for (let i = 0; i < sampleFrameCount; i++) {
      const sampleOffset = dataOffset + i * bytesPerSample * numChannels;
      if (numChannels === 1) {
        pcm[i] = view.getInt16(sampleOffset, true);
      } else {
        let sum = 0;
        for (let ch = 0; ch < numChannels; ch++) {
          sum += view.getInt16(sampleOffset + ch * 2, true);
        }
        pcm[i] = Math.round(sum / numChannels);
      }
    }
  } else if (bitsPerSample === 8) {
    for (let i = 0; i < sampleFrameCount; i++) {
      const sampleOffset = dataOffset + i * numChannels;
      if (numChannels === 1) {
        pcm[i] = (view.getUint8(sampleOffset) - 128) << 8;
      } else {
        let sum = 0;
        for (let ch = 0; ch < numChannels; ch++) {
          sum += view.getUint8(sampleOffset + ch) - 128;
        }
        pcm[i] = Math.round((sum / numChannels) << 8);
      }
    }
  } else if (bitsPerSample === 24) {
    for (let i = 0; i < sampleFrameCount; i++) {
      const sampleOffset = dataOffset + i * 3 * numChannels;
      if (numChannels === 1) {
        const b0 = view.getUint8(sampleOffset);
        const b1 = view.getUint8(sampleOffset + 1);
        const b2 = view.getUint8(sampleOffset + 2);
        const val = (b2 << 24) | (b1 << 16) | (b0 << 8);
        pcm[i] = val >> 16;
      } else {
        let sum = 0;
        for (let ch = 0; ch < numChannels; ch++) {
          const base = sampleOffset + ch * 3;
          const b0 = view.getUint8(base);
          const b1 = view.getUint8(base + 1);
          const b2 = view.getUint8(base + 2);
          const val = (b2 << 24) | (b1 << 16) | (b0 << 8);
          sum += val >> 16;
        }
        pcm[i] = Math.round(sum / numChannels);
      }
    }
  } else {
    throw new Error(`Unsupported bits per sample: ${bitsPerSample}`);
  }

  const duration = sampleFrameCount / sampleRate;

  const metadata: AudioMetadata = {
    sampleRate,
    channels: numChannels,
    bitsPerSample,
    sampleFormat: `pcm_${bitsPerSample}` as AudioMetadata["sampleFormat"],
    duration,
    totalSamples: sampleFrameCount,
  };

  return { pcm, metadata };
}

export function extractMetadata(wavData: ArrayBuffer): AudioMetadata {
  const { metadata } = decodeWav(wavData);
  return metadata;
}

function readString(view: DataView, offset: number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(view.getUint8(offset + i));
  }
  return result;
}
