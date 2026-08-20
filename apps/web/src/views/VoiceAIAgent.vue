<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useAPI } from "../composables/useAPI";
import { useAudioPlayer } from "../composables/useAudioPlayer";
import type { AgentPersona, ChatMessage, ChatSession } from "../types";

const { loading, post, get } = useAPI();
const { state: audioState, load, play, pause, stop } = useAudioPlayer();

const personas = ref<AgentPersona[]>([]);
const selectedPersonaId = ref("");
const session = ref<ChatSession | null>(null);
const messages = ref<ChatMessage[]>([]);
const inputText = ref("");
const autoSpeak = ref(false);
const isTyping = ref(false);
const speakingMessageId = ref<string | null>(null);

const chatContainer = ref<HTMLDivElement | null>(null);

const currentPersona = computed(() =>
  personas.value.find((p) => p.id === selectedPersonaId.value) || null,
);

const canSend = computed(
  () =>
    inputText.value.trim().length > 0 &&
    loading.value !== "loading" &&
    !isTyping.value,
);

onMounted(async () => {
  try {
    const data = await get<AgentPersona[]>("/agent/personas");
    personas.value = data;
    if (data.length > 0) {
      selectedPersonaId.value = data[0].id;
    }
  } catch {
    personas.value = [
      {
        id: "mas-budi",
        name: "Mas Budi",
        description: "PemudaJakarta yang friendly",
        voice_id: "kore",
        system_prompt: "Kamu adalah Mas Budi, pemudaJakarta yang ramah.",
        language: "id",
        dialect: "jakarta",
        personality: "friendly",
      },
      {
        id: "ceu-edah",
        name: "Ceu Edah",
        description: "Ibu Sunda yang hangat",
        voice_id: "zaafira",
        system_prompt: "Kamu adalah Ceu Edah, ibu Sunda yang hangat.",
        language: "su",
        dialect: "sunda",
        personality: "warm",
      },
      {
        id: "reporter",
        name: "Reporter",
        description: "Pembawa berita profesional",
        voice_id: "kore",
        system_prompt: "Kamu adalah reporter berita yang profesional.",
        language: "id",
        dialect: "baku",
        personality: "professional",
      },
      {
        id: "virtual-assistant",
        name: "VA",
        description: "Asisten virtual multibahasa",
        voice_id: "kore",
        system_prompt: "Kamu adalah asisten virtual yang multibahasa.",
        language: "id",
        dialect: "baku",
        personality: "helpful",
      },
    ];
    if (personas.value.length > 0) {
      selectedPersonaId.value = personas.value[0].id;
    }
  }
});

watch(selectedPersonaId, async (id) => {
  if (!id) return;
  try {
    const data = await post<ChatSession>("/agent/session", {
      persona_id: id,
    });
    session.value = data;
    messages.value = data.messages || [];
    await nextTick();
    scrollToBottom();
  } catch {
    session.value = {
      id: `session-${Date.now()}`,
      persona_id: id,
      title: "Sesi Baru",
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    messages.value = [];
  }
});

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

function fmtTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || !session.value) return;

  const userMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    role: "user",
    content: text,
    created_at: new Date().toISOString(),
  };
  messages.value.push(userMsg);
  inputText.value = "";
  await nextTick();
  scrollToBottom();

  isTyping.value = true;

  try {
    const res = await post<{ message: ChatMessage; audio_url?: string }>(
      "/agent/chat",
      {
        session_id: session.value.id,
        message: text,
        persona_id: selectedPersonaId.value,
      },
    );

    const assistantMsg: ChatMessage = {
      id: res.message?.id || `msg-${Date.now()}`,
      role: "assistant",
      content: res.message?.content || (res as unknown as { reply?: string }).reply || "",
      audio_url: res.audio_url || res.message?.audio_url,
      created_at: new Date().toISOString(),
    };
    messages.value.push(assistantMsg);

    if (autoSpeak.value && assistantMsg.content) {
      await speakMessage(assistantMsg);
    }
  } catch {
    const errorMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: "Maaf, terjadi kesalahan. Silakan coba lagi.",
      created_at: new Date().toISOString(),
    };
    messages.value.push(errorMsg);
  } finally {
    isTyping.value = false;
    await nextTick();
    scrollToBottom();
  }
}

async function speakMessage(msg: ChatMessage) {
  if (!msg.content) return;
  speakingMessageId.value = msg.id;

  try {
    if (msg.audio_url) {
      await play(msg.audio_url);
    } else {
      const res = await post<{ audio_url: string }>(
        "/agent/speak",
        {
          text: msg.content,
          persona_id: selectedPersonaId.value,
        },
      );
      if (res.audio_url) {
        msg.audio_url = res.audio_url;
        await play(res.audio_url);
      }
    }
  } catch {
    speakingMessageId.value = null;
  }
}

function stopSpeaking() {
  pause();
  speakingMessageId.value = null;
}

function clearChat() {
  messages.value = [];
  session.value = null;
  if (selectedPersonaId.value) {
    watch(
      () => selectedPersonaId.value,
      () => {},
      { immediate: true },
    );
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

onUnmounted(() => {
  stop();
});
</script>

<template>
  <div class="agent-root">
    <!-- Top Bar -->
    <div class="agent-topbar">
      <div class="topbar-left">
        <div class="persona-selector">
          <label class="topbar-label">Persona</label>
          <select v-model="selectedPersonaId" class="form-select persona-select">
            <option v-for="p in personas" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>
        <div v-if="currentPersona" class="persona-info">
          <span class="persona-desc">{{ currentPersona.description }}</span>
        </div>
      </div>
      <div class="topbar-right">
        <label class="toggle-row" title="Auto-play suara setiap balasan agent">
          <span class="toggle-label">Jadikan Suara</span>
          <button
            class="toggle-switch"
            :class="{ on: autoSpeak }"
            @click="autoSpeak = !autoSpeak"
            role="switch"
            :aria-checked="autoSpeak"
          >
            <span class="toggle-thumb" />
          </button>
        </label>
        <button class="btn-secondary btn-sm" @click="clearChat" title="Sesi baru">
          &#x21bb; Sesi Baru
        </button>
      </div>
    </div>

    <!-- Chat Area -->
    <div ref="chatContainer" class="chat-area">
      <div v-if="messages.length === 0" class="chat-empty">
        <div class="empty-icon">&#x1F5E3;</div>
        <p class="empty-title">Mulai percakapan</p>
        <p class="empty-sub" v-if="currentPersona">
          Bicara dengan {{ currentPersona.name }}
        </p>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="chat-bubble-wrap"
        :class="{ 'is-user': msg.role === 'user' }"
      >
        <div class="bubble-avatar" v-if="msg.role === 'assistant'">
          <span v-if="currentPersona">{{ currentPersona.name.charAt(0) }}</span>
          <span v-else>A</span>
        </div>
        <div class="bubble-content" :class="{ 'user-bubble': msg.role === 'user' }">
          <div class="bubble-meta">
            <span class="bubble-sender">
              {{ msg.role === 'user' ? 'Kamu' : (currentPersona?.name || 'Agent') }}
            </span>
            <span class="bubble-time">{{ fmtTimestamp(msg.created_at) }}</span>
          </div>
          <div class="bubble-text">{{ msg.content }}</div>
          <div v-if="msg.role === 'assistant' && msg.content" class="bubble-actions">
            <button
              v-if="speakingMessageId !== msg.id"
              class="btn-speak"
              @click="speakMessage(msg)"
              title="Dengarkan"
            >
              &#x1F50A; Dengarkan
            </button>
            <button
              v-else
              class="btn-speak btn-speak-active"
              @click="stopSpeaking"
              title="Hentikan"
            >
              &#x23F9; Berhenti
            </button>
            <span v-if="speakingMessageId === msg.id" class="speaking-indicator">
              <span class="dot" /><span class="dot" /><span class="dot" />
            </span>
          </div>
        </div>
        <div class="bubble-avatar user-avatar" v-if="msg.role === 'user'">
          U
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="chat-bubble-wrap typing-wrap">
        <div class="bubble-avatar">
          <span v-if="currentPersona">{{ currentPersona.name.charAt(0) }}</span>
          <span v-else>A</span>
        </div>
        <div class="bubble-content typing-bubble">
          <div class="typing-dots">
            <span class="dot" /><span class="dot" /><span class="dot" />
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="chat-input-area">
      <div class="input-row">
        <textarea
          v-model="inputText"
          class="chat-input"
          placeholder="Ketik pesan..."
          rows="1"
          :disabled="isTyping"
          @keydown="onKeydown"
        />
        <button
          class="btn-send"
          :disabled="!canSend"
          @click="sendMessage"
        >
          <span v-if="loading === 'loading' || isTyping" class="spinner" />
          <span v-else>&#x27A4;</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Top Bar ── */
.agent-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  flex-shrink: 0;
  gap: 12px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.persona-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
}

.persona-select {
  padding: 6px 10px;
  font-size: 0.85rem;
  min-width: 160px;
}

.persona-info {
  min-width: 0;
}

.persona-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
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
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  transition: transform 0.2s;
}

.toggle-switch.on .toggle-thumb {
  transform: translateX(16px);
}

/* ── Chat Area ── */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
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
}

.chat-bubble-wrap {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 80%;
  animation: bubble-in 0.2s ease;
}

.chat-bubble-wrap.is-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.user-avatar {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.bubble-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  min-width: 0;
}

.user-bubble {
  background: var(--accent-blue-dim);
  border-color: rgba(59, 130, 246, 0.25);
}

.bubble-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.bubble-sender {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.user-bubble .bubble-sender {
  color: var(--accent-blue);
}

.bubble-time {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.bubble-text {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.btn-speak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}

.btn-speak:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-speak-active {
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
}

.speaking-indicator {
  display: flex;
  gap: 3px;
  align-items: center;
}

.speaking-indicator .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent-blue);
  animation: pulse-dot 0.8s ease-in-out infinite;
}

.speaking-indicator .dot:nth-child(2) {
  animation-delay: 0.15s;
}

.speaking-indicator .dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* Typing */
.typing-wrap {
  opacity: 0.6;
}

.typing-bubble {
  padding: 12px 16px;
}

.typing-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.typing-dots .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typing-bounce 1.2s ease-in-out infinite;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* ── Input Area ── */
.chat-input-area {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  padding: 12px 16px;
  flex-shrink: 0;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  font-size: 0.88rem;
  border-radius: var(--radius-md);
  resize: none;
  min-height: 40px;
  max-height: 120px;
  line-height: 1.4;
}

.chat-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-dim);
}

.btn-send {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--accent-blue);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
  transition: all 0.15s;
}

.btn-send:hover:not(:disabled) {
  background: var(--accent-blue-hover);
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

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

/* ── Responsive ── */
@media (max-width: 768px) {
  .agent-topbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .topbar-left {
    flex-wrap: wrap;
  }

  .persona-select {
    min-width: 130px;
  }

  .chat-bubble-wrap {
    max-width: 90%;
  }

  .persona-info {
    display: none;
  }
}
</style>
