export function normalizePCM(
  pcm: Int16Array,
  targetPeak: number = 0.9,
): Int16Array {
  let maxAbs = 0;
  for (let i = 0; i < pcm.length; i++) {
    const abs = Math.abs(pcm[i]);
    if (abs > maxAbs) maxAbs = abs;
  }

  if (maxAbs === 0) return new Int16Array(pcm);

  const scale = (32767 * targetPeak) / maxAbs;
  const result = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    result[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * scale)));
  }
  return result;
}

export function getPeakLevel(pcm: Int16Array): number {
  let maxAbs = 0;
  for (let i = 0; i < pcm.length; i++) {
    const abs = Math.abs(pcm[i]);
    if (abs > maxAbs) maxAbs = abs;
  }
  return maxAbs / 32767;
}

export function getRMSLevel(pcm: Int16Array): number {
  if (pcm.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) {
    sum += pcm[i] * pcm[i];
  }
  return Math.sqrt(sum / pcm.length) / 32767;
}
