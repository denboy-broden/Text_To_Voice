<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import { useAPI } from "../composables/useAPI";
import { useAudioPlayer } from "../composables/useAudioPlayer";
import type { DramaScene } from "../types";

const { loading, post } = useAPI();
const { state: audioState, load, play, pause, stop } = useAudioPlayer();

interface SceneLine {
  id: string;
  speaker: string;
  voice: string;
  text: string;
}

const provider = ref<"gemini" | "openai">("gemini");
const outputFormat = ref<"wav" | "mp3">("wav");
const title = ref("");
const description = ref("");
const bgMusic = ref("");
const scenes = ref<SceneLine[]>([
  { id: `sc-${Date.now()}`, speaker: "Narator", voice: "Kore", text: "" },
]);
const generatingScript = ref(false);
const generatingAudio = ref(false);
const playlist = ref<{ index: number; label: string; audioUrl: string; duration?: number }[]>([]);
const currentTrack = ref(-1);
const generationError = ref("");

const availableVoices = [
  "Kore", "Zaafira", "Aris", "Siti", "Budi",
  "Rini", "Joko", "Dewi", "Andi", "Maya",
];

const canGenerateScript = computed(
  () => !generatingScript.value && !generatingAudio.value,
);

const canGenerateAudio = computed(() => {
  if (generatingAudio.value || generatingScript.value) return false;
  return scenes.value.some((s) => s.text.trim().length > 0);
});

function fmtTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function addScene() {
  const lastVoice = scenes.value.length > 0
    ? scenes.value[scenes.value.length - 1].voice
    : "Kore";
  scenes.value.push({
    id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    speaker: `Pembicara ${scenes.value.length + 1}`,
    voice: lastVoice,
    text: "",
  });
}

function removeScene(idx: number) {
  if (scenes.value.length <= 1) return;
  scenes.value.splice(idx, 1);
}

function moveScene(idx: number, dir: -1 | 1) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= scenes.value.length) return;
  const temp = scenes.value[idx];
  scenes.value[idx] = scenes.value[newIdx];
  scenes.value[newIdx] = temp;
}

async function generateScript() {
  if (!canGenerateScript.value) return;
  generatingScript.value = true;
  generationError.value = "";

  const existingDialogue = scenes.value
    .filter((s) => s.text.trim())
    .map((s) => `${s.speaker}: ${s.text}`)
    .join("\n\n");

  const prompt = existingDialogue
    ? `Lengkapi dan perbaiki naskah dialog berikut. Pertahankan karakter dan gaya bicara.\n\n${existingDialogue}`
    : `Buat naskah dialog drama pendek tentang: ${title.value || "topik bebas"}. Gunakan ${scenes.value.length} karakter. Format: Nama: Teks dialog`;

  try {
    const res = await post<{ reply?: string; message?: { content: string } }>(
      "/agent/chat",
      {
        message: prompt,
        persona_id: "reporter",
        mode: "script",
      },
    );

    const scriptText = res.message?.content || res.reply || "";
    const lines = scriptText.split("\n").filter((l: string) => l.trim());

    let sceneIdx = 0;
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)/);
      if (match) {
        const speaker = match[1].trim();
        const text = match[2].trim();
        if (sceneIdx < scenes.value.length) {
          scenes.value[sceneIdx].speaker = speaker;
          scenes.value[sceneIdx].text = text;
        } else {
          scenes.value.push({
            id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            speaker,
            voice: availableVoices[sceneIdx % availableVoices.length],
            text,
          });
        }
        sceneIdx++;
      }
    }

    if (!title.value) {
      title.value = "Naskah Drama";
    }
  } catch (err) {
    generationError.value = "Gagal membuat naskah. Silakan coba lagi.";
  } finally {
    generatingScript.value = false;
  }
}

async function generateAudio() {
  if (!canGenerateAudio.value) return;
  generatingAudio.value = true;
  generationError.value = "";
  playlist.value = [];
  currentTrack.value = -1;

  const filledScenes = scenes.value.filter((s) => s.text.trim());

  try {
    const payload = {
      dialogue: filledScenes.map((s) => `${s.speaker}: ${s.text}`).join("\n\n"),
      provider: provider.value,
      speakers: filledScenes.map((s) => ({
        speaker: s.speaker,
        voice: s.voice,
      })),
      format: outputFormat.value,
    };

    const res = await post<{
      audio_url?: string;
      audio?: ArrayBuffer;
      clips?: { url: string; index: number; speaker: string }[];
    }>("/tts/multi-speaker", payload);

    if (res.clips && res.clips.length > 0) {
      playlist.value = res.clips.map((c) => ({
        index: c.index,
        label: `${c.speaker} — Scene ${c.index + 1}`,
        audioUrl: c.url,
      }));
    } else if (res.audio_url) {
      const url = res.audio_url;
      playlist.value = filledScenes.map((s, i) => ({
        index: i,
        label: `${s.speaker} — Scene ${i + 1}`,
        audioUrl: url,
      }));
    }

    if (playlist.value.length > 0) {
      currentTrack.value = 0;
      await playTrack(0);
    }
  } catch {
    generationError.value = "Gagal membuat audio. Silakan coba lagi.";
  } finally {
    generatingAudio.value = false;
  }
}

async function playTrack(idx: number) {
  if (idx < 0 || idx >= playlist.value.length) return;
  currentTrack.value = idx;
  load(playlist.value[idx].audioUrl);
  await play();
}

function togglePlayPause() {
  if (audioState.value.playing) {
    pause();
  } else if (currentTrack.value >= 0) {
    play();
  } else if (playlist.value.length > 0) {
    playTrack(0);
  }
}

function playPrev() {
  if (currentTrack.value > 0) {
    playTrack(currentTrack.value - 1);
  }
}

function playNext() {
  if (currentTrack.value < playlist.value.length - 1) {
    playTrack(currentTrack.value + 1);
  }
}

function downloadTrack(url: string, label: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label.replace(/[^a-zA-Z0-9]/g, "_")}.${outputFormat.value}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

onUnmounted(() => {
  stop();
});
</script>

<template>
  <div class="drama-root">
    <div class="drama-panels">
      <!-- Left: Script Builder -->
      <section class="panel panel-script">
        <div class="panel-header">
          <h2 class="panel-title">Script Builder</h2>
          <span class="scene-count text-xs text-muted">{{ scenes.length }} adegan</span>
        </div>

        <div class="drama-meta">
          <input
            v-model="title"
            class="form-input"
            placeholder="Judul drama..."
          />
          <input
            v-model="description"
            class="form-input"
            placeholder="Deskripsi singkat..."
          />
        </div>

        <div class="scenes-list">
          <div
            v-for="(scene, idx) in scenes"
            :key="scene.id"
            class="scene-card"
          >
            <div class="scene-header">
              <span class="scene-index text-xs font-mono">#{{ idx + 1 }}</span>
              <div class="scene-reorder">
                <button
                  class="btn-reorder"
                  :disabled="idx === 0"
                  @click="moveScene(idx, -1)"
                  title="Pindah ke atas"
                >&#x25B2;</button>
                <button
                  class="btn-reorder"
                  :disabled="idx === scenes.length - 1"
                  @click="moveScene(idx, 1)"
                  title="Pindah ke bawah"
                >&#x25BC;</button>
              </div>
              <button
                class="btn-remove-scene"
                :disabled="scenes.length <= 1"
                @click="removeScene(idx)"
                title="Hapus adegan"
              >&#x2715;</button>
            </div>

            <div class="scene-fields">
              <div class="scene-row">
                <input
                  v-model="scene.speaker"
                  class="form-input scene-speaker"
                  placeholder="Nama karakter"
                />
                <select v-model="scene.voice" class="form-select scene-voice">
                  <option v-for="v in availableVoices" :key="v" :value="v">
                    {{ v }}
                  </option>
                </select>
              </div>
              <textarea
                v-model="scene.text"
                class="scene-textarea"
                placeholder="Dialog..."
                rows="2"
              />
            </div>
          </div>
        </div>

        <button class="btn-ghost btn-add-scene" @click="addScene">
          + Tambah Adegan
        </button>
      </section>

      <!-- Right: Settings + Preview -->
      <section class="panel panel-settings">
        <div class="panel-header">
          <h2 class="panel-title">Pengaturan</h2>
        </div>

        <div class="form-group">
          <label class="form-label">Provider</label>
          <div class="btn-group">
            <button
              class="btn-toggle"
              :class="{ active: provider === 'gemini' }"
              @click="provider = 'gemini'"
            >Gemini</button>
            <button
              class="btn-toggle"
              :class="{ active: provider === 'openai' }"
              @click="provider = 'openai'"
            >OpenAI</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Format Output</label>
          <div class="btn-group">
            <button
              class="btn-toggle"
              :class="{ active: outputFormat === 'wav' }"
              @click="outputFormat = 'wav'"
            >WAV</button>
            <button
              class="btn-toggle"
              :class="{ active: outputFormat === 'mp3' }"
              @click="outputFormat = 'mp3'"
            >MP3</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Musik Latar</label>
          <select v-model="bgMusic" class="form-select">
            <option value="">Tanpa musik</option>
            <option value="keroncong">Keroncong</option>
            <option value="gamelan">Gamelan</option>
            <option value="ambient">Ambient</option>
            <option value="jazz">Jazz</option>
          </select>
          <span class="form-hint">Musik latar akan ditambahkan di masa depan</span>
        </div>

        <div class="generate-actions">
          <button
            class="btn-generate btn-script"
            :disabled="!canGenerateScript"
            @click="generateScript"
          >
            <span v-if="generatingScript" class="spinner" />
            <span v-else>&#x270E;</span>
            <span>{{ generatingScript ? 'Membuat...' : 'Buat Naskah' }}</span>
          </button>

          <button
            class="btn-generate btn-audio"
            :disabled="!canGenerateAudio"
            @click="generateAudio"
          >
            <span v-if="generatingAudio" class="spinner" />
            <span v-else>&#x25B6;</span>
            <span>{{ generatingAudio ? 'Memproses...' : 'Buat Audio' }}</span>
          </button>
        </div>

        <div v-if="generationError" class="error-bar">
          <span class="error-icon">!</span>
          <span>{{ generationError }}</span>
        </div>

        <!-- Playlist -->
        <div v-if="playlist.length > 0" class="playlist-section">
          <div class="panel-header" style="margin-top: 16px;">
            <h3 class="panel-title">Playlist</h3>
          </div>

          <!-- Now Playing Controls -->
          <div class="now-playing" v-if="currentTrack >= 0">
            <div class="np-controls">
              <button class="btn-icon" @click="playPrev" :disabled="currentTrack === 0">
                &#x23EE;
              </button>
              <button class="btn-icon btn-play-main" @click="togglePlayPause">
                <span v-if="audioState.playing">&#x23F8;</span>
                <span v-else>&#x25B6;</span>
              </button>
              <button
                class="btn-icon"
                @click="playNext"
                :disabled="currentTrack === playlist.length - 1"
              >
                &#x23ED;
              </button>
            </div>
            <div class="np-info">
              <span class="np-label">{{ playlist[currentTrack]?.label }}</span>
            </div>
          </div>

          <div class="playlist-items">
            <div
              v-for="(track, tIdx) in playlist"
              :key="tIdx"
              class="playlist-item"
              :class="{ active: tIdx === currentTrack }"
              @click="playTrack(tIdx)"
            >
              <span class="pl-icon">
                <span v-if="tIdx === currentTrack && audioState.playing">&#x25B6;</span>
                <span v-else>{{ tIdx + 1 }}</span>
              </span>
              <span class="pl-label">{{ track.label }}</span>
              <button
                class="btn-icon btn-download-pl"
                @click.stop="downloadTrack(track.audioUrl, track.label)"
                title="Unduh"
              >&#x2193;</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.drama-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.drama-panels {
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

.panel-script {
  flex: 1.2;
  border-right: 1px solid var(--border-subtle);
}

.panel-settings {
  flex: 0.8;
  border-left: 1px solid var(--border-subtle);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.scene-count {
  font-family: var(--font-mono);
}

/* ── Drama Meta ── */
.drama-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

/* ── Scenes ── */
.scenes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.scene-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s;
}

.scene-card:focus-within {
  border-color: var(--accent-blue);
}

.scene-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scene-index {
  color: var(--text-muted);
  font-weight: 500;
  min-width: 24px;
}

.scene-reorder {
  display: flex;
  gap: 2px;
}

.btn-reorder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 0.6rem;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  transition: all 0.15s;
}

.btn-reorder:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-reorder:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.btn-remove-scene {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 0.75rem;
  background: transparent;
  color: var(--accent-red);
  border-radius: 4px;
  transition: all 0.15s;
}

.btn-remove-scene:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
}

.btn-remove-scene:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.scene-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scene-row {
  display: flex;
  gap: 6px;
}

.scene-speaker {
  flex: 1;
  padding: 6px 8px;
  font-size: 0.82rem;
}

.scene-voice {
  width: 110px;
  padding: 6px 8px;
  font-size: 0.82rem;
}

.scene-textarea {
  width: 100%;
  min-height: 48px;
  padding: 8px;
  font-size: 0.85rem;
  resize: vertical;
}

.btn-add-scene {
  align-self: flex-start;
  margin-top: 10px;
  padding: 6px 14px;
  font-size: 0.82rem;
}

/* ── Form ── */
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

/* ── Generate Buttons ── */
.generate-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-generate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  color: #fff;
  transition: all 0.2s;
}

.btn-script {
  background: var(--bg-elevated);
}

.btn-script:hover:not(:disabled) {
  background: #4b5563;
}

.btn-audio {
  background: var(--accent-blue);
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.3);
}

.btn-audio:hover:not(:disabled) {
  background: var(--accent-blue-hover);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.btn-generate:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Error ── */
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  margin-top: 12px;
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

/* ── Playlist ── */
.playlist-section {
  margin-top: 4px;
}

.now-playing {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
}

.np-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
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

.btn-play-main {
  width: 34px;
  height: 34px;
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
  border-radius: 50%;
}

.btn-play-main:hover {
  background: var(--accent-blue);
  color: #fff;
}

.np-info {
  min-width: 0;
  flex: 1;
}

.np-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.playlist-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}

.playlist-item:hover {
  background: var(--bg-secondary);
}

.playlist-item.active {
  background: var(--accent-blue-dim);
}

.pl-icon {
  width: 24px;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.playlist-item.active .pl-icon {
  color: var(--accent-blue);
}

.pl-label {
  flex: 1;
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-item.active .pl-label {
  color: var(--text-primary);
}

.btn-download-pl {
  width: 26px;
  height: 26px;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.playlist-item:hover .btn-download-pl {
  opacity: 1;
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

/* ── Responsive ── */
@media (max-width: 768px) {
  .drama-panels {
    flex-direction: column;
    overflow-y: auto;
  }

  .panel-script {
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
    min-height: 300px;
  }

  .panel-settings {
    border-left: none;
  }

  .scene-row {
    flex-direction: column;
  }

  .scene-voice {
    width: 100%;
  }
}
</style>
