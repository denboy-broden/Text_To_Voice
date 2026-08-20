<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useAPI } from "../composables/useAPI";
import { useAudioPlayer } from "../composables/useAudioPlayer";
import type { TTSResponse as APIResponse } from "../types";
import {
  DIALECT_PRESETS,
  VOICES,
  MODEL_REGISTRY,
  getVoicesForModel,
  getTTSModels,
  type VoiceInfo,
} from "@nusantara/core";

// ── API & Audio ──
const { loading, error, get, post } = useAPI();
const {
  state: audioState,
  load,
  play,
  pause,
  stop,
  seek,
  setVolume,
  getFrequencyData,
  getTimeDomainData,
} = useAudioPlayer();

// ── Input State ──
const inputText = ref("");
const presetKey = ref<string>("");
const isMultiSpeakerMode = ref(false);

// ── Settings State ──
const availableProviders = ref<{ tts: string[]; llm: string[] }>({ tts: [], llm: [] });
const provider = ref("");
const selectedModelId = ref("");
const selectedVoice = ref("");
const languageDialect = ref("");
const instructions = ref("");
const outputFormat = ref<"wav" | "mp3">("wav");

// ── Multi-Speaker State ──
interface SpeakerLine {
  speaker: string;
  voice: string;
  text: string;
}
const speakers = ref<SpeakerLine[]>([
  { speaker: "Narator", voice: "Kore", text: "" },
]);

// ── Result State ──
const generatedAudioUrl = ref<string | null>(null);
const generatedAudioBlob = ref<Blob | null>(null);
const generationDuration = ref(0);
const waveformCanvas = ref<HTMLCanvasElement | null>(null);
let waveformRaf = 0;

// ── Computed ──
const charCount = computed(() => inputText.value.length);
const maxChars = 5000;

const ttsModels = computed(() => getTTSModels());

const filteredModels = computed(() =>
  ttsModels.value.filter((m) => m.provider === provider.value)
);

const voicesForModel = computed(() => {
  const voiceNames = getVoicesForModel(selectedModelId.value);
  if (voiceNames.length === 0) {
    return VOICES.map((v) => v.name);
  }
  return voiceNames;
});

const currentPreset = computed(() =>
  presetKey.value ? DIALECT_PRESETS.find((p) => p.key === presetKey.value) : null
);

const canGenerate = computed(() => {
  if (loading.value === "loading") return false;
  if (isMultiSpeakerMode.value) {
    return (
      speakers.value.some((s) => s.text.trim().length > 0) &&
      selectedModelId.value.length > 0
    );
  }
  return (
    inputText.value.trim().length > 0 && selectedModelId.value.length > 0
  );
});

const hasAudio = computed(() => generatedAudioUrl.value !== null);

// ── Preset Application ──
watch(presetKey, (key) => {
  const preset = DIALECT_PRESETS.find((p) => p.key === key);
  if (!preset) return;
  languageDialect.value = preset.name;
  selectedVoice.value = preset.defaultVoice;
  instructions.value = preset.customInstruction;
});

// ── Provider / Model Cascade ──
watch(provider, () => {
  const models = filteredModels.value;
  if (models.length > 0) {
    selectedModelId.value = models[0].id;
  }
});

watch(selectedModelId, () => {
  const voices = voicesForModel.value;
  if (voices.length > 0 && !voices.includes(selectedVoice.value)) {
    selectedVoice.value = voices[0];
  }
});

// ── Load available providers from server ──
async function loadProviders() {
  try {
    const res = await get<{ tts: string[]; llm: string[] }>("/providers/active/list");
    availableProviders.value = res;
    if (res.tts.length > 0 && !provider.value) {
      provider.value = res.tts[0];
    }
  } catch {
    availableProviders.value = { tts: ["gemini", "openai"], llm: ["gemini", "openai"] };
    provider.value = "gemini";
  }
}

// ── Init defaults on mount ──
onMounted(async () => {
  await loadProviders();
  const models = filteredModels.value;
  if (models.length > 0) {
    selectedModelId.value = models[0].id;
  }
  const voices = voicesForModel.value;
  if (voices.length > 0) {
    selectedVoice.value = voices[0];
  }
});

// ── Format time helper ──
function fmtTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Progress click ──
function onProgressClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  seek(pct * audioState.value.duration);
}

// ── Generate TTS ──
async function generateTTS() {
  generatedAudioUrl.value = null;
  generatedAudioBlob.value = null;
  stop();

  const startTime = Date.now();

  try {
    if (isMultiSpeakerMode.value) {
      const dialogue = speakers.value
        .filter((s) => s.text.trim())
        .map((s) => `${s.speaker}: ${s.text}`)
        .join("\n\n");

      const payload = {
        dialogue,
        provider: provider.value,
        model: selectedModelId.value,
        speakers: speakers.value
          .filter((s) => s.text.trim())
          .map((s) => ({
            speaker: s.speaker,
            voice: s.voice,
          })),
        format: outputFormat.value,
      };

      const res = await post<APIResponse>("/tts/multi-speaker", payload);
      generationDuration.value = Date.now() - startTime;
      await loadAudioFromResponse(res);
    } else {
      const payload = {
        text: inputText.value,
        provider: provider.value,
        model: selectedModelId.value,
        voice: selectedVoice.value,
        language: languageDialect.value,
        instructions: instructions.value || undefined,
        format: outputFormat.value,
      };

      const res = await post<APIResponse>("/tts/generate", payload);
      generationDuration.value = Date.now() - startTime;
      await loadAudioFromResponse(res);
    }
  } catch {
    generationDuration.value = Date.now() - startTime;
  }
}

async function loadAudioFromResponse(res: APIResponse) {
  let blob: Blob;
  if (res.audio_url) {
    const resp = await fetch(res.audio_url);
    blob = await resp.blob();
  } else {
    blob = new Blob([], { type: "audio/wav" });
  }

  generatedAudioBlob.value = blob;
  const url = URL.createObjectURL(blob);
  generatedAudioUrl.value = url;
  load(url);
  await nextTick();
  startWaveformLoop();
}

// ── Waveform Drawing ──
function startWaveformLoop() {
  cancelAnimationFrame(waveformRaf);
  drawWaveform();
}

function drawWaveform() {
  const canvas = waveformCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  const freqData = getFrequencyData();
  const timeData = getTimeDomainData();

  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "rgba(59, 130, 246, 0.03)");
  bgGrad.addColorStop(1, "rgba(59, 130, 246, 0.08)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Frequency bars
  if (freqData && freqData.length > 0) {
    const barCount = Math.min(64, freqData.length);
    const barWidth = (w / barCount) * 0.7;
    const gap = (w / barCount) * 0.3;

    for (let i = 0; i < barCount; i++) {
      const val = freqData[i] / 255;
      const barH = val * h * 0.85;
      const x = i * (barWidth + gap) + gap / 2;
      const y = (h - barH) / 2;

      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, `rgba(59, 130, 246, ${0.3 + val * 0.5})`);
      grad.addColorStop(1, `rgba(147, 197, 253, ${0.2 + val * 0.4})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      const r = Math.min(barWidth / 2, 3);
      ctx.roundRect(x, y, barWidth, barH, r);
      ctx.fill();
    }
  }

  // Time-domain waveform overlay
  if (timeData && timeData.length > 0) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
    ctx.lineWidth = 1.5;

    const sliceW = w / timeData.length;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) {
        ctx.moveTo(0, y);
      } else {
        ctx.lineTo(i * sliceW, y);
      }
    }
    ctx.stroke();
  }

  // Center line
  ctx.beginPath();
  ctx.strokeStyle = "rgba(59, 130, 246, 0.15)";
  ctx.lineWidth = 1;
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  waveformRaf = requestAnimationFrame(drawWaveform);
}

// ── Download ──
function downloadAudio() {
  if (!generatedAudioBlob.value || !generatedAudioUrl.value) return;
  const ext = outputFormat.value;
  const a = document.createElement("a");
  a.href = generatedAudioUrl.value;
  a.download = `tts-output.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Save to library ──
async function saveToLibrary() {
  if (!generatedAudioBlob.value) return;
  try {
    const form = new FormData();
    const ext = outputFormat.value;
    form.append("file", generatedAudioBlob.value, `tts-output.${ext}`);
    form.append("source_type", "tts");
    form.append("tags", isMultiSpeakerMode.value ? "multi-speaker" : "single");
    await post("/library/upload", form);
  } catch {
    // error handled by useAPI
  }
}

// ── Speaker helpers ──
function addSpeaker() {
  speakers.value.push({
    speaker: `Pembicara ${speakers.value.length + 1}`,
    voice: voicesForModel.value[0] || "Kore",
    text: "",
  });
}

function removeSpeaker(idx: number) {
  if (speakers.value.length <= 1) return;
  speakers.value.splice(idx, 1);
}

// ── Stop waveform on unmount ──
onUnmounted(() => {
  cancelAnimationFrame(waveformRaf);
  if (generatedAudioUrl.value) {
    URL.revokeObjectURL(generatedAudioUrl.value);
  }
});
</script>

<template>
  <div class="studio-root">
    <!-- ── Top Panels ── -->
    <div class="studio-panels">
      <!-- LEFT: Input -->
      <section class="panel panel-input">
        <div class="panel-header">
          <h2 class="panel-title">Teks Input</h2>
          <span class="char-counter" :class="{ over: charCount > maxChars }">
            {{ charCount.toLocaleString() }} / {{ maxChars.toLocaleString() }}
          </span>
        </div>

        <!-- Preset selector -->
        <div class="form-group">
          <label class="form-label">Preset Dialek</label>
          <select v-model="presetKey" class="form-select">
            <option value="">Pilih Preset</option>
            <option
              v-for="p in DIALECT_PRESETS"
              :key="p.key"
              :value="p.key"
            >
              {{ p.name }}
            </option>
          </select>
        </div>

        <!-- Single text input -->
        <div v-if="!isMultiSpeakerMode" class="text-input-wrap">
          <textarea
            v-model="inputText"
            class="text-input"
            placeholder="Ketik teks yang ingin Anda konversikan..."
            :maxlength="maxChars"
          />
        </div>

        <!-- Multi-speaker input -->
        <div v-else class="multi-speaker-wrap">
          <div
            v-for="(sp, idx) in speakers"
            :key="idx"
            class="speaker-row"
          >
            <div class="speaker-row-header">
              <select v-model="sp.voice" class="form-select speaker-voice-select">
                <option
                  v-for="v in voicesForModel"
                  :key="v"
                  :value="v"
                >
                  {{ v }}
                </option>
              </select>
              <input
                v-model="sp.speaker"
                class="form-input speaker-name-input"
                placeholder="Nama pembicara"
              />
              <button
                class="btn-icon btn-remove"
                :disabled="speakers.length <= 1"
                @click="removeSpeaker(idx)"
              >
                &#x2715;
              </button>
            </div>
            <textarea
              v-model="sp.text"
              class="text-input speaker-text-input"
              placeholder="Teks untuk pembicara ini..."
            />
          </div>
          <button class="btn-ghost btn-add-speaker" @click="addSpeaker">
            + Tambah Pembicara
          </button>
        </div>
      </section>

      <!-- RIGHT: Settings -->
      <section class="panel panel-settings">
        <div class="panel-header">
          <h2 class="panel-title">Pengaturan Suara</h2>
        </div>

        <!-- Dialog mode toggle -->
        <div class="form-group">
          <label class="toggle-row">
            <span class="form-label" style="margin-bottom: 0">Mode Dialog</span>
            <button
              class="toggle-switch"
              :class="{ on: isMultiSpeakerMode }"
              @click="isMultiSpeakerMode = !isMultiSpeakerMode"
              role="switch"
              :aria-checked="isMultiSpeakerMode"
            >
              <span class="toggle-thumb" />
            </button>
          </label>
          <span class="form-hint" v-if="isMultiSpeakerMode">
            Mode dialog aktif — teks akan dipecah per pembicara.
          </span>
        </div>

        <!-- Provider -->
        <div class="form-group">
          <label class="form-label">Provider</label>
          <div class="btn-group">
            <button
              v-for="p in availableProviders.tts"
              :key="p"
              class="btn-toggle"
              :class="{ active: provider === p }"
              @click="provider = p"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <!-- Model -->
        <div class="form-group">
          <label class="form-label">Model</label>
          <select v-model="selectedModelId" class="form-select">
            <option
              v-for="m in filteredModels"
              :key="m.id"
              :value="m.id"
            >
              {{ m.displayName }}
            </option>
          </select>
        </div>

        <!-- Voice -->
        <div class="form-group">
          <label class="form-label">Suara</label>
          <select v-model="selectedVoice" class="form-select">
            <option
              v-for="v in voicesForModel"
              :key="v"
              :value="v"
            >
              {{ v }}
            </option>
          </select>
          <div class="voice-meta" v-if="selectedVoice">
            <template v-for="vi in VOICES" :key="vi.name">
              <span v-if="vi.name === selectedVoice" class="voice-meta-tag">
                {{ vi.gender === "male" ? "Laki-laki" : "Perempuan" }}
                &middot;
                {{ vi.description }}
              </span>
            </template>
          </div>
        </div>

        <!-- Language / Dialect -->
        <div class="form-group">
          <label class="form-label">Bahasa / Dialek</label>
          <input
            v-model="languageDialect"
            class="form-input"
            placeholder="contoh: Bahasa Indonesia, Jawa, Sunda"
          />
        </div>

        <!-- Instructions -->
        <div class="form-group">
          <label class="form-label">Instruksi Gaya</label>
          <textarea
            v-model="instructions"
            class="text-input instructions-input"
            placeholder="Instruksi gaya bicara untuk model..."
            rows="3"
          />
        </div>

        <!-- Format -->
        <div class="form-group">
          <label class="form-label">Format Output</label>
          <div class="btn-group">
            <button
              class="btn-toggle"
              :class="{ active: outputFormat === 'wav' }"
              @click="outputFormat = 'wav'"
            >
              WAV
            </button>
            <button
              class="btn-toggle"
              :class="{ active: outputFormat === 'mp3' }"
              @click="outputFormat = 'mp3'"
            >
              MP3
            </button>
          </div>
        </div>

        <!-- Preset sample text fill -->
        <div class="form-group" v-if="currentPreset">
          <button class="btn-ghost btn-sample" @click="inputText = currentPreset.sampleText">
            Isi Contoh Teks
          </button>
        </div>
      </section>
    </div>

    <!-- ── Bottom: Generate + Player ── -->
    <section class="panel-bottom">
      <!-- Error -->
      <div v-if="error" class="error-bar">
        <span class="error-icon">!</span>
        <span>{{ error.detail }}</span>
      </div>

      <!-- Generate button -->
      <div class="generate-row">
        <button
          class="btn-generate"
          :disabled="!canGenerate"
          @click="generateTTS"
        >
          <span v-if="loading === 'loading'" class="spinner" />
          <span v-else class="generate-icon">&#9654;</span>
          <span>{{ loading === 'loading' ? 'Memproses...' : 'Buat Suara' }}</span>
        </button>
        <span v-if="generationDuration > 0 && loading !== 'loading'" class="gen-time text-xs text-muted">
          {{ (generationDuration / 1000).toFixed(1) }}s
        </span>
      </div>

      <!-- Player -->
      <div v-if="hasAudio" class="player-section">
        <!-- Waveform -->
        <canvas
          ref="waveformCanvas"
          class="waveform-canvas"
        />

        <!-- Controls row -->
        <div class="player-controls">
          <!-- Play/Pause -->
          <button class="btn-icon player-play" @click="audioState.playing ? pause() : play()">
            <span v-if="audioState.playing">&#9646;&#9646;</span>
            <span v-else>&#9654;</span>
          </button>

          <!-- Progress bar -->
          <div class="progress-bar" @click="onProgressClick">
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{
                  width: audioState.duration
                    ? ((audioState.currentTime / audioState.duration) * 100) + '%'
                    : '0%'
                }"
              />
            </div>
          </div>

          <!-- Time -->
          <span class="player-time font-mono text-xs">
            {{ fmtTime(audioState.currentTime) }} / {{ fmtTime(audioState.duration) }}
          </span>

          <!-- Volume -->
          <div class="volume-wrap">
            <button class="btn-icon" @click="setVolume(audioState.volume > 0 ? 0 : 1)">
              <span v-if="audioState.volume === 0">&#128263;</span>
              <span v-else>&#128266;</span>
            </button>
            <input
              type="range"
              class="volume-slider"
              min="0"
              max="1"
              step="0.05"
              :value="audioState.volume"
              @input="setVolume(parseFloat(($event.target as HTMLInputElement).value))"
            />
          </div>

          <!-- Actions -->
          <div class="player-actions">
            <button class="btn-secondary btn-sm" @click="downloadAudio" title="Unduh">
              &#8595; Unduh
            </button>
            <button class="btn-secondary btn-sm" @click="saveToLibrary" title="Simpan ke Library">
              &#9733; Stok Audio
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════
   Layout
   ═══════════════════════════════════════════ */

.studio-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.studio-panels {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
}

.panel-input {
  flex: 1;
  border-right: 1px solid var(--border-subtle);
}

.panel-settings {
  flex: 1;
  border-left: 1px solid var(--border-subtle);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.char-counter {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  transition: color 0.15s;
}

.char-counter.over {
  color: var(--accent-red);
}

/* ═══════════════════════════════════════════
   Form Elements
   ═══════════════════════════════════════════ */

.form-group {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-hint {
  display: block;
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.form-select,
.form-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 0.875rem;
}

.text-input {
  width: 100%;
  font-size: 0.875rem;
  resize: vertical;
}

.text-input:focus,
.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-dim);
}

/* ═══════════════════════════════════════════
   Text Area (Main Input)
   ═══════════════════════════════════════════ */

.text-input-wrap {
  flex: 1;
  display: flex;
  min-height: 0;
}

.text-input-wrap .text-input {
  flex: 1;
  min-height: 160px;
  padding: 12px;
}

/* ═══════════════════════════════════════════
   Multi-Speaker
   ═══════════════════════════════════════════ */

.multi-speaker-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.speaker-row {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.speaker-row-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speaker-voice-select {
  width: 130px;
  flex-shrink: 0;
  padding: 6px 8px;
  font-size: 0.8rem;
}

.speaker-name-input {
  flex: 1;
  padding: 6px 8px;
  font-size: 0.8rem;
}

.speaker-text-input {
  min-height: 60px;
  padding: 8px;
}

.btn-add-speaker {
  align-self: flex-start;
  padding: 6px 14px;
  font-size: 0.8rem;
}

/* ═══════════════════════════════════════════
   Buttons
   ═══════════════════════════════════════════ */

.btn-group {
  display: flex;
  gap: 0;
}

.btn-toggle {
  flex: 1;
  padding: 8px 14px;
  font-size: 0.82rem;
  font-weight: 500;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  transition: all 0.15s;
}

.btn-toggle:first-child {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.btn-toggle:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.btn-toggle:not(:first-child) {
  border-left: none;
}

.btn-toggle.active {
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.btn-toggle:hover:not(.active) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 1rem;
  padding: 0;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-remove {
  color: var(--accent-red);
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: 0.82rem;
  font-weight: 500;
  transition: all 0.15s;
}

.btn-ghost:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.btn-sample {
  width: 100%;
  justify-content: center;
  border-style: solid;
  background: var(--bg-secondary);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 0.8rem;
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

/* ═══════════════════════════════════════════
   Toggle Switch
   ═══════════════════════════════════════════ */

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  padding: 0;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.toggle-switch.on {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-primary);
  transition: transform 0.2s;
}

.toggle-switch.on .toggle-thumb {
  transform: translateX(18px);
}

/* ═══════════════════════════════════════════
   Voice Meta
   ═══════════════════════════════════════════ */

.voice-meta {
  margin-top: 6px;
}

.voice-meta-tag {
  display: inline-block;
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
}

/* ═══════════════════════════════════════════
   Bottom Panel
   ═══════════════════════════════════════════ */

.panel-bottom {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  padding: 14px 20px;
  min-height: 0;
  flex-shrink: 0;
}

/* Error */
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  margin-bottom: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-sm);
  color: var(--accent-red);
  font-size: 0.82rem;
}

.error-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-red);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

/* Generate row */
.generate-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.btn-generate {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 28px;
  font-size: 1rem;
  font-weight: 600;
  background: var(--accent-blue);
  color: #fff;
  border-radius: var(--radius-md);
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.3);
  transition: all 0.2s;
}

.btn-generate:hover:not(:disabled) {
  background: var(--accent-blue-hover);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.btn-generate:active:not(:disabled) {
  transform: translateY(0);
}

.btn-generate:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.generate-icon {
  font-size: 0.85rem;
}

.gen-time {
  font-family: var(--font-mono);
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ═══════════════════════════════════════════
   Player Section
   ═══════════════════════════════════════════ */

.player-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.waveform-canvas {
  width: 100%;
  height: 90px;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  display: block;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-play {
  width: 38px;
  height: 38px;
  font-size: 1.1rem;
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
  border-radius: 50%;
  flex-shrink: 0;
}

.player-play:hover {
  background: var(--accent-blue);
  color: #fff;
}

/* Progress */
.progress-bar {
  flex: 1;
  height: 28px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: var(--bg-elevated);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar:hover .progress-track {
  height: 6px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.player-time {
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 80px;
  text-align: center;
}

/* Volume */
.volume-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.volume-slider {
  width: 70px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-elevated);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-secondary);
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-secondary);
  border: none;
  cursor: pointer;
}

.player-actions {
  display: flex;
  gap: 8px;
  margin-left: 4px;
}

/* ═══════════════════════════════════════════
   Responsive — Mobile
   ═══════════════════════════════════════════ */

@media (max-width: 768px) {
  .studio-panels {
    flex-direction: column;
    overflow-y: auto;
  }

  .panel-input {
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
    min-height: 260px;
  }

  .panel-settings {
    border-left: none;
    border-top: none;
  }

  .text-input-wrap .text-input {
    min-height: 120px;
  }

  .player-controls {
    flex-wrap: wrap;
    gap: 8px;
  }

  .volume-wrap {
    display: none;
  }

  .progress-bar {
    order: 10;
    flex: 1 1 100%;
  }

  .player-time {
    min-width: auto;
  }

  .btn-generate {
    padding: 10px 20px;
    font-size: 0.9rem;
  }

  .waveform-canvas {
    height: 60px;
  }
}
</style>
