import { ref, shallowRef, onUnmounted } from "vue";

export interface AudioState {
  playing: boolean;
  paused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export function useAudioPlayer() {
  const audioEl = shallowRef<HTMLAudioElement | null>(null);
  const state = ref<AudioState>({
    playing: false,
    paused: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
  });

  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;

  function ensureAudio(): HTMLAudioElement {
    if (!audioEl.value) {
      audioEl.value = new Audio();
      audioEl.value.crossOrigin = "anonymous";

      audioEl.value.addEventListener("play", () => {
        state.value.playing = true;
        state.value.paused = false;
      });
      audioEl.value.addEventListener("pause", () => {
        state.value.playing = false;
        state.value.paused = true;
      });
      audioEl.value.addEventListener("ended", () => {
        state.value.playing = false;
        state.value.paused = false;
        state.value.currentTime = 0;
      });
      audioEl.value.addEventListener("timeupdate", () => {
        if (audioEl.value) {
          state.value.currentTime = audioEl.value.currentTime;
        }
      });
      audioEl.value.addEventListener("loadedmetadata", () => {
        if (audioEl.value) {
          state.value.duration = audioEl.value.duration;
        }
      });
    }
    return audioEl.value;
  }

  function getAnalyser(): AnalyserNode | null {
    if (analyserNode) return analyserNode;
    if (!audioEl.value) return null;

    audioContext = new AudioContext();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    sourceNode = audioContext.createMediaElementSource(audioEl.value);
    sourceNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);
    return analyserNode;
  }

  function load(src: string) {
    const audio = ensureAudio();
    audio.src = src;
    audio.load();
    state.value.currentTime = 0;
    state.value.duration = 0;
    state.value.playing = false;
    state.value.paused = false;
  }

  async function play(src?: string) {
    if (src) load(src);
    const audio = ensureAudio();
    try {
      if (audioContext?.state === "suspended") {
        await audioContext.resume();
      }
      await audio.play();
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }

  function pause() {
    audioEl.value?.pause();
  }

  function stop() {
    if (audioEl.value) {
      audioEl.value.pause();
      audioEl.value.currentTime = 0;
      state.value.playing = false;
      state.value.paused = false;
    }
  }

  function seek(time: number) {
    if (audioEl.value) {
      audioEl.value.currentTime = time;
      state.value.currentTime = time;
    }
  }

  function setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    state.value.volume = clamped;
    if (audioEl.value) {
      audioEl.value.volume = clamped;
    }
  }

  function getFrequencyData(): Uint8Array | null {
    const analyser = getAnalyser();
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }

  function getTimeDomainData(): Uint8Array | null {
    const analyser = getAnalyser();
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    return data;
  }

  onUnmounted(() => {
    stop();
    sourceNode?.disconnect();
    analyserNode?.disconnect();
    audioContext?.close();
  });

  return {
    state,
    load,
    play,
    pause,
    stop,
    seek,
    setVolume,
    getAnalyser,
    getFrequencyData,
    getTimeDomainData,
  };
}
