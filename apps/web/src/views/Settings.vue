<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAPI } from "../composables/useAPI";

const { get, post, del } = useAPI();

interface ProviderEntry {
  id: string;
  type: "gemini" | "openai" | "openrouter" | "openai-compatible";
  hasApiKey: boolean;
  hasBaseURL: boolean;
  name?: string;
  ttsModel?: string;
  llmModel?: string;
  defaultVoice?: string;
}

const providers = ref<ProviderEntry[]>([]);
const loading = ref(false);
const message = ref("");
const messageType = ref<"success" | "error">("success");

// Form
const showForm = ref(false);
const editingId = ref<string | null>(null);
const formType = ref<"gemini" | "openai" | "openrouter" | "openai-compatible">("gemini");
const formId = ref("");
const formApiKey = ref("");
const formBaseURL = ref("");
const formName = ref("");
const formTTSModel = ref("tts-1");
const formLLMModel = ref("gpt-4o-mini");
const formDefaultVoice = ref("alloy");

const providerTypes = [
  { value: "gemini", label: "Google Gemini", icon: "💎" },
  { value: "openai", label: "OpenAI", icon: "🟢" },
  { value: "openrouter", label: "OpenRouter", icon: "🔀" },
  { value: "openai-compatible", label: "OpenAI Compatible (Custom)", icon: "🔧" },
];

const showBaseURL = computed(() => formType.value === "openai-compatible");
const showLLMFields = computed(() => formType.value === "openai-compatible" || formType.value === "gemini");

async function loadProviders() {
  loading.value = true;
  try {
    const res = await get<{ providers: ProviderEntry[] }>("/providers");
    providers.value = res.providers ?? [];
  } catch {
    providers.value = [];
  } finally {
    loading.value = false;
  }
}

function openAddForm() {
  editingId.value = null;
  formType.value = "gemini";
  formId.value = "";
  formApiKey.value = "";
  formBaseURL.value = "";
  formName.value = "";
  formTTSModel.value = "tts-1";
  formLLMModel.value = "gpt-4o-mini";
  formDefaultVoice.value = "alloy";
  showForm.value = true;
}

function openEditForm(p: ProviderEntry) {
  editingId.value = p.id;
  formType.value = p.type;
  formId.value = p.id;
  formApiKey.value = "";
  formBaseURL.value = "";
  formName.value = p.name ?? "";
  formTTSModel.value = p.ttsModel ?? "tts-1";
  formLLMModel.value = p.llmModel ?? "gpt-4o-mini";
  formDefaultVoice.value = p.defaultVoice ?? "alloy";
  showForm.value = true;
}

function autoFillDefaults() {
  switch (formType.value) {
    case "gemini":
      formName.value = "Gemini";
      break;
    case "openai":
      formName.value = "OpenAI";
      formId.value = "openai";
      break;
    case "openrouter":
      formName.value = "OpenRouter";
      formId.value = "openrouter";
      break;
    case "openai-compatible":
      formName.value = "";
      formId.value = "";
      break;
  }
}

async function saveProvider() {
  if (!formId.value.trim()) {
    showMessage("Provider ID wajib diisi", "error");
    return;
  }
  if (!formApiKey.value.trim()) {
    showMessage("API Key wajib diisi", "error");
    return;
  }
  if (formType.value === "openai-compatible" && !formBaseURL.value.trim()) {
    showMessage("Base URL wajib diisi untuk Custom Provider", "error");
    return;
  }

  loading.value = true;
  try {
    await post("/providers", {
      id: formId.value.trim(),
      type: formType.value,
      apiKey: formApiKey.value.trim(),
      baseURL: formBaseURL.value.trim() || undefined,
      name: formName.value.trim() || undefined,
      ttsModel: formTTSModel.value.trim() || undefined,
      llmModel: formLLMModel.value.trim() || undefined,
      defaultVoice: formDefaultVoice.value.trim() || undefined,
    });

    showMessage(
      editingId.value
        ? `Provider "${formId.value}" berhasil diupdate`
        : `Provider "${formId.value}" berhasil ditambahkan. Restart server untuk apply.`,
      "success",
    );
    showForm.value = false;
    await loadProviders();
  } catch (err: any) {
    showMessage(err.message || "Gagal menyimpan", "error");
  } finally {
    loading.value = false;
  }
}

async function deleteProvider(id: string) {
  if (!confirm(`Hapus provider "${id}"?`)) return;

  loading.value = true;
  try {
    await del(`/providers/${id}`);
    showMessage(`Provider "${id}" dihapus. Restart server untuk unregister.`, "success");
    await loadProviders();
  } catch (err: any) {
    showMessage(err.message || "Gagal menghapus", "error");
  } finally {
    loading.value = false;
  }
}

function showMessage(msg: string, type: "success" | "error") {
  message.value = msg;
  messageType.value = type;
  setTimeout(() => { message.value = ""; }, 5000);
}

function typeLabel(type: string): string {
  return providerTypes.find((t) => t.value === type)?.label ?? type;
}

function typeIcon(type: string): string {
  return providerTypes.find((t) => t.value === type)?.icon ?? "❓";
}

onMounted(loadProviders);
</script>

<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="settings-header">
      <div>
        <h2 class="settings-title">Pengaturan Provider</h2>
        <p class="settings-desc">Kelola koneksi ke provider TTS dan LLM</p>
      </div>
      <button class="btn btn-primary" @click="openAddForm">+ Tambah Provider</button>
    </div>

    <!-- Message -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>

    <!-- Provider List -->
    <div v-if="loading && providers.length === 0" class="loading-state">Memuat...</div>

    <div v-else-if="providers.length === 0" class="empty-state">
      <p>Belum ada provider yang dikonfigurasi.</p>
      <p class="text-muted">Klik "Tambah Provider" untuk mulai.</p>
    </div>

    <div v-else class="provider-grid">
      <div v-for="p in providers" :key="p.id" class="provider-card">
        <div class="card-header">
          <span class="card-icon">{{ typeIcon(p.type) }}</span>
          <div class="card-info">
            <div class="card-id">{{ p.id }}</div>
            <div class="card-type">{{ typeLabel(p.type) }}</div>
          </div>
          <div class="card-status" :class="p.hasApiKey ? 'connected' : 'disconnected'">
            {{ p.hasApiKey ? "Terhubung" : "Belum dikonfigurasi" }}
          </div>
        </div>
        <div class="card-details">
          <div v-if="p.hasBaseURL" class="detail-row">
            <span class="detail-label">Base URL</span>
            <span class="detail-value font-mono">{{ p.name || "-" }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">API Key</span>
            <span class="detail-value">{{ p.hasApiKey ? "••••••••" : "Belum diisi" }}</span>
          </div>
          <div v-if="p.ttsModel" class="detail-row">
            <span class="detail-label">TTS Model</span>
            <span class="detail-value font-mono">{{ p.ttsModel }}</span>
          </div>
          <div v-if="p.llmModel" class="detail-row">
            <span class="detail-label">LLM Model</span>
            <span class="detail-value font-mono">{{ p.llmModel }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm" @click="openEditForm(p)">Edit</button>
          <button class="btn btn-sm btn-danger" @click="deleteProvider(p.id)">Hapus</button>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingId ? "Edit Provider" : "Tambah Provider" }}</h3>
          <button class="btn-close" @click="showForm = false">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Provider Type -->
          <div class="form-group">
            <label class="form-label">Provider Type</label>
            <div class="type-selector">
              <button
                v-for="t in providerTypes"
                :key="t.value"
                :class="['type-btn', { active: formType === t.value }]"
                @click="formType = t.value as any; autoFillDefaults()"
              >
                <span>{{ t.icon }}</span>
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>

          <!-- Provider ID -->
          <div class="form-group">
            <label class="form-label">Provider ID</label>
            <input
              v-model="formId"
              type="text"
              class="form-input"
              placeholder="contoh: my-gemini, 9router-win"
              :disabled="!!editingId"
            />
            <span class="form-hint">ID unik untuk mengenali provider ini</span>
          </div>

          <!-- API Key -->
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input
              v-model="formApiKey"
              type="password"
              class="form-input"
              placeholder="sk-xxxxxxxxxxxx"
            />
          </div>

          <!-- Base URL (only for openai-compatible) -->
          <div v-if="showBaseURL" class="form-group">
            <label class="form-label">Base URL</label>
            <input
              v-model="formBaseURL"
              type="text"
              class="form-input"
              placeholder="http://localhost:20128/v1"
            />
            <span class="form-hint">Endpoint provider, sertakan /v1 jika diperlukan</span>
          </div>

          <!-- Name (only for openai-compatible) -->
          <div v-if="showBaseURL" class="form-group">
            <label class="form-label">Nama Tampilan</label>
            <input
              v-model="formName"
              type="text"
              class="form-input"
              placeholder="9router-Win"
            />
          </div>

          <!-- TTS Model -->
          <div class="form-group">
            <label class="form-label">TTS Model</label>
            <input
              v-model="formTTSModel"
              type="text"
              class="form-input"
              :placeholder="formType === 'gemini' ? 'gemini-2.5-flash-preview-tts' : 'tts-1'"
            />
          </div>

          <!-- LLM Model (only for openai-compatible / gemini) -->
          <div v-if="showLLMFields" class="form-group">
            <label class="form-label">LLM Model</label>
            <input
              v-model="formLLMModel"
              type="text"
              class="form-input"
              :placeholder="formType === 'gemini' ? 'gemini-3-flash-preview' : 'gpt-4o-mini'"
            />
          </div>

          <!-- Default Voice -->
          <div class="form-group">
            <label class="form-label">Default Voice</label>
            <input
              v-model="formDefaultVoice"
              type="text"
              class="form-input"
              :placeholder="formType === 'gemini' ? 'Kore' : 'alloy'"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="showForm = false">Batal</button>
          <button class="btn btn-primary" :disabled="loading" @click="saveProvider">
            {{ loading ? "Menyimpan..." : "Simpan" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 24px;
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.settings-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.settings-desc {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 4px;
}

.message {
  padding: 10px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: 0.85rem;
}

.message.success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.message.error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.provider-grid {
  display: grid;
  gap: 16px;
}

.provider-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-icon {
  font-size: 1.5rem;
}

.card-info {
  flex: 1;
}

.card-id {
  font-weight: 600;
  font-size: 1rem;
}

.card-type {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.card-status {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.card-status.connected {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.card-status.disconnected {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.card-details {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.detail-label {
  color: var(--text-muted);
}

.detail-value {
  color: var(--text-primary);
}

.font-mono {
  font-family: monospace;
}

.card-actions {
  display: flex;
  gap: 8px;
}

/* ── Buttons ── */
.btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:hover {
  background: var(--bg-hover);
}

.btn-primary {
  background: var(--accent-blue);
  color: #fff;
  border-color: var(--accent-blue);
}

.btn-primary:hover {
  background: var(--accent-blue-hover);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.btn-danger {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.15);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h3 {
  font-size: 1rem;
  font-weight: 600;
}

.modal-body {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-subtle);
}

/* ── Form ── */
.form-group {
  display: grid;
  gap: 6px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.form-input {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--accent-blue);
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.type-btn:hover {
  border-color: var(--accent-blue);
  color: var(--text-primary);
}

.type-btn.active {
  border-color: var(--accent-blue);
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
}
</style>
