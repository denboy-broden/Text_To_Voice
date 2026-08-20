<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useAudioPlayer } from "../composables/useAudioPlayer";

interface LibraryEntry {
  id: string;
  title: string;
  audioUrl: string;
  provider: string;
  voice: string;
  createdAt: string;
  tags: string[];
  durationMs?: number;
}

const { state: audioState, load, play, pause, stop, seek, setVolume } = useAudioPlayer();

const STORAGE_KEY = "nusantara-audio-library";

const library = ref<LibraryEntry[]>([]);
const searchQuery = ref("");
const filterTag = ref("");
const playerEntryId = ref<string | null>(null);

onMounted(() => {
  loadLibrary();
});

function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      library.value = JSON.parse(raw);
    }
  } catch {
    library.value = [];
  }
}

function saveLibrary() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library.value));
  } catch {
    // localStorage full or unavailable
  }
}

const allTags = computed(() => {
  const tagSet = new Set<string>();
  for (const entry of library.value) {
    for (const tag of entry.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
});

const filteredLibrary = computed(() => {
  let items = library.value;

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.voice.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  if (filterTag.value) {
    items = items.filter((e) => e.tags.includes(filterTag.value));
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
});

const currentEntry = computed(() =>
  library.value.find((e) => e.id === playerEntryId.value) || null,
);

function fmtTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDuration(ms?: number): string {
  if (!ms) return "--:--";
  return fmtTime(ms / 1000);
}

function providerColor(p: string): string {
  if (p.toLowerCase().includes("gemini")) return "var(--accent-green)";
  if (p.toLowerCase().includes("openai")) return "var(--accent-blue)";
  return "var(--text-muted)";
}

async function playEntry(entry: LibraryEntry) {
  if (playerEntryId.value === entry.id && audioState.value.playing) {
    pause();
    return;
  }
  playerEntryId.value = entry.id;
  load(entry.audioUrl);
  await play();
}

function togglePlayPause() {
  if (audioState.value.playing) {
    pause();
  } else if (currentEntry.value) {
    play();
  }
}

function downloadEntry(entry: LibraryEntry) {
  const ext = entry.audioUrl.includes(".wav") ? "wav" : entry.audioUrl.includes(".mp3") ? "mp3" : "wav";
  const a = document.createElement("a");
  a.href = entry.audioUrl;
  a.download = `${entry.title.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function deleteEntry(id: string) {
  library.value = library.value.filter((e) => e.id !== id);
  saveLibrary();
  if (playerEntryId.value === id) {
    stop();
    playerEntryId.value = null;
  }
}

function onProgressClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  seek(pct * audioState.value.duration);
}

function saveToLibrary(entry: LibraryEntry) {
  const exists = library.value.some((e) => e.id === entry.id);
  if (!exists) {
    library.value.push(entry);
    saveLibrary();
  }
}

function exportLibrary() {
  const data = JSON.stringify(
    library.value.map((e) => ({
      ...e,
      audioUrl: "[blob-removed]",
    })),
    null,
    2,
  );
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nusantara-library-export.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

onUnmounted(() => {
  stop();
});
</script>

<template>
  <div class="library-root">
    <!-- Top Bar -->
    <div class="library-topbar">
      <div class="topbar-search">
        <span class="search-icon">&#x1F50D;</span>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="Cari audio..."
        />
      </div>
      <div class="topbar-filters">
        <select v-model="filterTag" class="form-select filter-select">
          <option value="">Semua Tag</option>
          <option v-for="tag in allTags" :key="tag" :value="tag">
            {{ tag }}
          </option>
        </select>
        <span class="item-count text-xs text-muted">
          {{ filteredLibrary.length }} file
        </span>
        <button class="btn-secondary btn-sm" @click="exportLibrary" title="Export metadata">
          &#x2B07; Export
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div class="library-grid">
      <div v-if="filteredLibrary.length === 0" class="library-empty">
        <div class="empty-icon">&#x1F4C2;</div>
        <p class="empty-title">Belum ada audio</p>
        <p class="empty-sub">Hasilkan audio dari TTS Studio atau Agent, lalu simpan ke sini.</p>
      </div>

      <div
        v-for="entry in filteredLibrary"
        :key="entry.id"
        class="audio-card"
        :class="{ 'is-playing': playerEntryId === entry.id && audioState.playing }"
      >
        <div class="card-top">
          <span class="card-provider" :style="{ color: providerColor(entry.provider) }">
            {{ entry.provider }}
          </span>
          <span class="card-duration">{{ fmtDuration(entry.durationMs) }}</span>
        </div>

        <h3 class="card-title">{{ entry.title }}</h3>

        <div class="card-meta">
          <span class="card-voice">{{ entry.voice }}</span>
          <span class="card-date">{{ fmtDate(entry.createdAt) }}</span>
        </div>

        <div class="card-tags" v-if="entry.tags.length > 0">
          <span v-for="tag in entry.tags" :key="tag" class="tag-badge">
            {{ tag }}
          </span>
        </div>

        <div class="card-actions">
          <button
            class="btn-card btn-play-card"
            @click="playEntry(entry)"
            title="Putar"
          >
            <span v-if="playerEntryId === entry.id && audioState.playing">&#x23F8;</span>
            <span v-else>&#x25B6;</span>
          </button>
          <button
            class="btn-card"
            @click="downloadEntry(entry)"
            title="Unduh"
          >&#x2193;</button>
          <button
            class="btn-card btn-delete"
            @click="deleteEntry(entry.id)"
            title="Hapus"
          >&#x2715;</button>
        </div>
      </div>
    </div>

    <!-- Player Bar -->
    <Transition name="slide-up">
      <div v-if="currentEntry" class="player-bar">
        <div class="player-bar-inner">
          <div class="pb-info">
            <span class="pb-title">{{ currentEntry.title }}</span>
            <span class="pb-voice text-xs">{{ currentEntry.voice }}</span>
          </div>

          <div class="pb-controls">
            <button class="btn-icon pb-play" @click="togglePlayPause">
              <span v-if="audioState.playing">&#x23F8;</span>
              <span v-else>&#x25B6;</span>
            </button>

            <div class="pb-progress" @click="onProgressClick">
              <div class="pb-track">
                <div
                  class="pb-fill"
                  :style="{
                    width: audioState.duration
                      ? ((audioState.currentTime / audioState.duration) * 100) + '%'
                      : '0%',
                  }"
                />
              </div>
            </div>

            <span class="pb-time font-mono text-xs">
              {{ fmtTime(audioState.currentTime) }} / {{ fmtTime(audioState.duration) }}
            </span>
          </div>

          <div class="pb-extra">
            <button class="btn-icon" @click="downloadEntry(currentEntry)" title="Unduh">
              &#x2193;
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.library-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Top Bar ── */
.library-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.topbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 400px;
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  padding: 0 10px;
  transition: border-color 0.15s;
}

.topbar-search:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-dim);
}

.search-icon {
  font-size: 0.85rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 8px 0;
  font-size: 0.85rem;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.topbar-filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-select {
  width: 140px;
  padding: 6px 10px;
  font-size: 0.82rem;
}

.item-count {
  font-family: var(--font-mono);
}

/* ── Grid ── */
.library-grid {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  align-content: start;
}

.library-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 8px;
  opacity: 0.5;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 4px;
}

.empty-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.empty-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  max-width: 300px;
}

/* ── Audio Card ── */
.audio-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.audio-card:hover {
  border-color: var(--border-default);
}

.audio-card.is-playing {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 1px var(--accent-blue-dim);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-provider {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-duration {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-muted);
}

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-voice {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.card-date {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-badge {
  font-size: 0.68rem;
  padding: 2px 7px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border-radius: 4px;
}

.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.btn-card {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.8rem;
  padding: 0;
  transition: all 0.15s;
}

.btn-card:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-play-card {
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
}

.btn-play-card:hover {
  background: var(--accent-blue);
  color: #fff;
}

.btn-delete {
  color: var(--accent-red);
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* ── Player Bar ── */
.player-bar {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.player-bar-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.pb-info {
  min-width: 0;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pb-title {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pb-voice {
  color: var(--text-muted);
}

.pb-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}

.btn-icon:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.pb-play {
  width: 36px;
  height: 36px;
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
  border-radius: 50%;
  font-size: 1rem;
}

.pb-play:hover {
  background: var(--accent-blue);
  color: #fff;
}

.pb-progress {
  flex: 1;
  height: 28px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.pb-track {
  width: 100%;
  height: 4px;
  background: var(--bg-elevated);
  border-radius: 2px;
  overflow: hidden;
}

.pb-progress:hover .pb-track {
  height: 6px;
}

.pb-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.pb-time {
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 75px;
  text-align: center;
}

.pb-extra {
  display: flex;
  gap: 4px;
}

/* ── Slide Up Transition ── */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* ── Shared ── */
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
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

.btn-sm {
  padding: 5px 10px;
  font-size: 0.78rem;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .library-topbar {
    flex-wrap: wrap;
  }

  .topbar-search {
    max-width: 100%;
  }

  .topbar-filters {
    flex-wrap: wrap;
  }

  .library-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
    padding: 12px;
  }

  .player-bar-inner {
    padding: 8px 12px;
    gap: 10px;
  }

  .pb-info {
    max-width: 120px;
  }

  .pb-extra {
    display: none;
  }
}
</style>
