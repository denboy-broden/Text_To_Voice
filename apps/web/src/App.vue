<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const tabs = [
  { path: "/", label: "TTS Studio", icon: "🎙️", name: "tts-studio" },
  { path: "/agent", label: "Voice AI Agent", icon: "🤖", name: "voice-agent" },
  { path: "/drama", label: "Drama / Podcast", icon: "🎭", name: "drama" },
  { path: "/library", label: "Audio Library", icon: "📁", name: "library" },
  { path: "/settings", label: "Pengaturan", icon: "⚙️", name: "settings" },
];

function isActive(path: string): boolean {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
}
</script>

<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo-icon">🎵</span>
        <div class="logo-text">
          <span class="font-semibold">Nusantara</span>
          <span class="text-xs text-muted">Voice AI Studio</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="tab in tabs"
          :key="tab.path"
          :class="['nav-item', { active: isActive(tab.path) }]"
          @click="router.push(tab.path)"
        >
          <span class="nav-icon">{{ tab.icon }}</span>
          <span class="nav-label">{{ tab.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="status-indicator">
          <span class="status-dot"></span>
          <span class="text-xs text-muted">Server Connected</span>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <header class="top-bar">
        <h1 class="text-lg font-semibold">{{ route.meta.title }}</h1>
        <div class="top-bar-actions">
          <span class="text-xs text-muted font-mono">v0.1.0</span>
        </div>
      </header>

      <div class="content-area">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.logo-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 8px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  width: 100%;
  transition: background-color 0.15s, color 0.15s;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
}

.nav-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-green);
  box-shadow: 0 0 6px var(--accent-green);
}

/* ── Main ── */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: var(--header-height);
  min-height: var(--header-height);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
}

.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
