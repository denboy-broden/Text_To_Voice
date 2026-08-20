# BOOTSTRAP.md — Arsitektur & Roadmap Text_To_Voice

## Overview

Aplikasi **Nusantara Voice AI** — Text-to-Speech studio dengan dukungan multi-dialek bahasa daerah Indonesia (Jawa, Sunda, dll), AI Agent, dan percakapan multi-speaker.

**Stack:** TypeScript (monorepo) + pnpm workspaces  
**UI Reference:** TTS.md (prototipe HTML/JS, bukan production code)

---

## Arsitektur Target

```
Browser (UI)
    ↓ fetch()
Server API (Hono/Express)
    ↓
┌─────────────────────────────────┐
│         AI Service Layer        │
│                                 │
│  ┌───────────┐  ┌────────────┐  │
│  │ LLM Engine│  │ TTS Engine │  │
│  │ (naskah,  │  │ (text →    │  │
│  │  agent,   │  │  speech)   │  │
│  │  translate)│  │            │  │
│  └─────┬─────┘  └─────┬──────┘  │
│        │              │         │
│  ┌─────┴──────────────┴──────┐  │
│  │    Provider Abstraction    │  │
│  │  ┌─────────────────────┐   │  │
│  │  │ OpenAI Provider     │   │  │
│  │  │ OpenAI-Compatible   │   │  │
│  │  │ Google Gemini       │   │  │
│  │  │ OpenRouter          │   │  │
│  │  │ Custom Providers    │   │  │
│  │  └─────────────────────┘   │  │
│  └────────────┬───────────────┘  │
│               │                  │
│  ┌────────────┴───────────────┐  │
│  │      Model Registry        │  │
│  │  (capabilities, voices,    │  │
│  │   modality filtering)      │  │
│  └────────────────────────────┘  │
└────────────────┬────────────────┘
                 ↓
┌────────────────┴────────────────┐
│        Audio Engine             │
│  PCM decode → WAV/MP3 encode   │
│  Waveform, duration, metadata  │
└────────────────┬────────────────┘
                 ↓
            Browser (play/download)
```

**Prinsip utama:** UI tidak pernah memanggil provider API langsung. Semua request melewati server API yang mengabstraksi provider.

---

## Target Struktur Project

```
Text_To_Voice/
│
├── TTS.md                         # Referensi UI (prototipe)
├── BOOTSTRAP.md                   # Dokumen ini
│
├── sources/                       # Referensi/knowledge base (jangan diubah)
│   ├── openai-node-main/          # ★ SDK OpenAI — pola adapter provider
│   ├── wavefile-master/           # ★ WAV chunk processing — referensi audio engine
│   ├── deprecated-generative-ai-js-main/ # Referensi Gemini API call (deprecated)
│   ├── typescript-starter-master/ # Struktur TypeScript config
│   ├── turborepo-main/            # Referensi monorepo (npm packages saja)
│   ├── python-sdk-main/           # Referensi Python SDK (info only)
│   ├── awesome-compose-main/      # Docker Compose reference
│   └── boilerplate-main/          # Boilerplate reference
│
├── apps/
│   └── web/                       # Frontend (React/Next.js/Vue)
│
├── packages/
│   ├── core/                      # Abstraksi internal + types + config + utilities
│   ├── providers/                 # Provider adapters (OpenAI, Gemini, OpenRouter, dll)
│   ├── tts-engine/                # TTS engine orchestration
│   └── audio-engine/              # PCM/WAV/MP3/OGG processing
│
├── server/
│   └── api/                       # Backend API (Hono atau Express)
│
├── docker-compose.yml             # Deployment
├── tests/
│
├── .env
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

**Catatan:**
- `plugins/`, `skills/`, `mcp/` **ditiadakan** untuk MVP. Buat folder ini hanya jika sudah ada use case nyata.
- `router/` dan `config/` digabung ke `packages/core/`.
- `ai-core/` digabung ke `packages/core/`.
- `shared/` digabung ke `packages/core/`.

---

## Prinsip Arsitektur

### 1. Provider Abstraction

UI tidak boleh langsung memanggil:

```
❌  Browser → Gemini API
❌  Browser → OpenAI API
❌  Browser → OpenRouter API
```

Harus seperti ini:

```
✅  Browser → Server API → Provider Abstraction → Model API
```

Alasan: provider/model bisa diganti tanpa mengubah UI. OpenRouter menggunakan pola API kompatibel dengan OpenAI (support `baseURL` custom).

### 2. Pemisahan LLM vs TTS

Dua jenis pekerjaan yang berbeda:

| Kategori | Fungsi | Contoh Model |
|---|---|---|
| **LLM / AI** | Membuat naskah, menerjemahkan, AI Agent, chat | Gemini 3 Flash, GPT-4o, Claude |
| **TTS** | Text → Speech, voice selection, speed, emotion | Gemini 2.5 Flash TTS, OpenAI `tts-1`, ElevenLabs |

Jangan asumsikan "semua model AI = TTS". Model registry harus membedakan `capabilities`.

### 3. Kontrak Internal

Semua provider harus menghasilkan format response yang sama:

```typescript
// Request
interface TTSRequest {
  text: string;
  provider: string;          // "openai" | "gemini" | "openrouter" | ...
  model: string;             // "gemini-2.5-flash-tts" | "tts-1" | ...
  voice?: string;            // "Kore" | "alloy" | ...
  language?: string;         // "id" | "jv" | "su" | ...
  instructions?: string;     // custom prompt gaya bicara
  speed?: number;            // 0.5 - 2.0
  emotion?: string;          // "ceria" | "serius" | ...
  format?: "wav" | "mp3" | "ogg";
  metadata?: Record<string, unknown>;
}

// Response
interface TTSResponse {
  audio: ArrayBuffer;        // binary audio data
  mimeType: string;          // "audio/wav" | "audio/mpeg" | ...
  format: "wav" | "mp3" | "ogg";
  duration?: number;         // detik
  provider: string;
  model: string;
  usage?: {                  // billing tracking
    characters?: number;
    credits?: number;
  };
}
```

### 4. Model Registry

```typescript
interface ModelInfo {
  id: string;                // "gemini-2.5-flash-preview-tts"
  provider: string;          // "gemini"
  displayName: string;       // "Gemini 2.5 Flash TTS"
  capabilities: {
    tts: boolean;            // text-to-speech
    llm: boolean;            // text generation
    streaming: boolean;
    multiSpeaker: boolean;   // multi-speaker dialogue
    voices: string[];        // ["Kore", "Puck", "Zephyr", ...]
  };
  modality: "audio" | "text" | "multimodal";
}
```

Contoh data registry:

```typescript
const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: "gemini-2.5-flash-preview-tts",
    provider: "gemini",
    displayName: "Gemini 2.5 Flash TTS",
    capabilities: {
      tts: true, llm: false, streaming: false,
      multiSpeaker: true,
      voices: ["Kore", "Puck", "Zephyr", "Charon", "Aoede",
               "Fenrir", "Leda", "Sulafat", "Vindemiatrix", "Algieba"]
    },
    modality: "audio"
  },
  {
    id: "gemini-3-flash-preview",
    provider: "gemini",
    displayName: "Gemini 3 Flash",
    capabilities: {
      tts: false, llm: true, streaming: true,
      multiSpeaker: false, voices: []
    },
    modality: "text"
  },
  // OpenAI tts-1, openai gpt-4o, dll ditambahkan sesuai kebutuhan
];
```

UI otomatis filter model berdasarkan `capabilities.tts === true` saat user memilih model TTS.

---

## Analisis sources/

| Source | Isi Aktual | Relevansi | Aksi |
|---|---|---|---|
| `openai-node-main/` | OpenAI Node.js SDK (TypeScript) — client lengkap untuk chat, completions, embeddings, audio/speech | **Tinggi** — Pola adapter provider, error handling, types | Ambil pola adapter + types |
| `wavefile-master/` | Ruby gem untuk baca/tulis WAV (RIFF chunks, PCM 8/16/24/32-bit, float, mono/stereo) | **Tinggi** — Konsep WAV chunk processing | Ambil konsep, implementasi di JS/TS |
| `deprecated-generative-ai-js-main/` | Google Generative AI JS SDK versi lama — contoh panggilan Gemini API | **Sedang** — Referensi pola API call Gemini | Ambil pola request/response, jangan pakai kodenya langsung |
| `typescript-starter-master/` | Template TypeScript dengan tsconfig, build setup | **Sedang** — Struktur project | Ambil tsconfig patterns |
| `turborepo-main/` | Turborepo source code | **Rendah** — Cukup pakai `pnpm` + `turborepo` via npm | Install via npm, jangan clone |
| `python-sdk-main/` | OpenAI Python SDK | **Rendah** — Project ini pakai TypeScript | Info only |
| `awesome-compose-main/` | Kumpulan Docker Compose configs | **Rendah** — Cukup buat sendiri | Buat docker-compose.yml manual |
| `boilerplate-main/` | Generic boilerplate | **Rendah** | Skip |

**Prinsip:** Jangan copy source code ke production. Ambil pola/konsep, periksa lisensi, implementasi sendiri dalam TypeScript.

---

## Data Aktual dari TTS.md

### API Endpoints yang Digunakan

| Endpoint | Fungsi |
|---|---|
| `POST /v1beta/models/gemini-2.5-flash-preview-tts:generateContent` | TTS single & multi-speaker |
| `POST /v1beta/models/gemini-3-flash-preview:generateContent` | LLM untuk AI Agent (chat) |

### Voice Models (10 opsi)

| Voice | Gender | Karakter |
|---|---|---|
| Kore | Wanita | Tegas & Jelas |
| Puck | Pria | Energetik & Ramah |
| Zephyr | Wanita | Cerah & Hangat |
| Charon | Pria | Dalam & Wibawa |
| Aoede | Wanita | Merdu & Santai |
| Fenrir | Pria | Bertenaga & Antusias |
| Leda | Wanita | Muda & Halus |
| Sulafat | Wanita | Hangat & Lembut |
| Vindemiatrix | Wanita | Lembut & Tenang |
| Algieba | Pria | Smooth & Khas |

### Dialect Presets (6 opsi)

| Key | Nama | Default Voice | Custom Instruction |
|---|---|---|---|
| `jawa` | Jawa Medok | Kore | Logat Jawa medok kental, hangat, khas |
| `sunda` | Sunda Halus | Aoede | Logat Sunda halus, mengayun, merdu, khas Priangan |
| `gaul` | Jakarta / Gaul | Puck | Santai khas anak muda Jakarta/Betawi |
| `formal` | Pembaca Berita | Charon | Professional TV news anchor |
| `dongeng` | Pendongeng | Sulafat | Mendongeng penuh ekspresi, hangat, imajinatif |
| `anime` | Ceria / Energetik | Leda | Energetic, happy, upbeat |

### TTS Payload Pattern (Gemini)

```json
{
  "contents": [{ "parts": [{ "text": "..." }] }],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": { "voiceName": "Kore" }
      }
    }
  }
}
```

### Multi-Speaker Payload Pattern

```json
{
  "speechConfig": {
    "multiSpeakerVoiceConfig": {
      "speakerVoiceConfigs": [
        { "speaker": "Speaker1", "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Kore" } } },
        { "speaker": "Speaker2", "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Puck" } } }
      ]
    }
  }
}
```

### Audio Response Format

- **MIME Type:** `audio/L16;rate=24000` (PCM 16-bit, 24kHz)
- **Encoding:** base64 dalam `inlineData.data`
- **Processing:** base64 → PCM Int16Array → WAV (header RIFF 44 bytes)

### AI Agent Pattern

- **Model:** Gemini 3 Flash (`gemini-3-flash-preview`)
- **System Instruction:** Persona-based (Mas Budi, Ceu Edah, Reporter, VA Profesional)
- **Output:** Text → user klik "Dengarkan Suara" → switch ke TTS engine

---

## Phase Pembangunan

### PHASE 0 — Audit & Perencanaan
- [ ] Audit semua source di `sources/`, catat lisensi masing-masing
- [ ] Buat `docs/SOURCE_AUDIT.md` berisi temuan audit
- [ ] Definisikan final stack (Hono/Express, React/Vue/Next.js, database?)
- [ ] Definisikan `TTSRequest` dan `TTSResponse` dalam TypeScript
- [ ] Definisikan `ModelInfo` dan model registry seed data
- [ ] Definisikan provider interface (abstract class atau interface)
- [ ] Definisikan audio engine interface
- [ ] Setup `.env.example` dengan semua API keys yang dibutuhkan

### PHASE 1 — Bootstrap Project
- [ ] Init monorepo: `pnpm init`, `pnpm-workspace.yaml`
- [ ] Install turborepo via npm (`turbo` dev dependency)
- [ ] Buat `packages/core/` — shared types, config, utilities
- [ ] Buat `packages/providers/` — provider abstraction skeleton
- [ ] Buat `packages/tts-engine/` — TTS engine skeleton
- [ ] Buat `packages/audio-engine/` — audio processing skeleton
- [ ] Buat `server/api/` — API server skeleton (Hono recommended)
- [ ] Buat `apps/web/` — frontend skeleton
- [ ] Setup TypeScript configs, linting, testing base

### PHASE 2 — Provider System
- [ ] Implement `GeminiProvider` (Google Generative AI API)
- [ ] Implement `OpenAIProvider` (OpenAI SDK pattern dari `openai-node-main`)
- [ ] Implement `OpenAICompatibleProvider` (generic adapter: baseURL + apiKey)
- [ ] Implement `OpenRouterProvider` (extends OpenAICompatibleProvider)
- [ ] Implement Model Registry (seed data dari TTS.md)
- [ ] Provider selection logic berdasarkan request

### PHASE 3 — TTS Engine
- [ ] Implement TTS orchestration (terima TTSRequest, dispatch ke provider)
- [ ] Single-speaker TTS flow
- [ ] Multi-speaker dialogue TTS flow
- [ ] Prompt assembly (text + customInstruction + speed + emotion)
- [ ] Retry logic dengan exponential backoff
- [ ] API endpoint: `POST /api/tts/generate`

### PHASE 4 — Audio Engine
- [ ] PCM decoder (base64 → Int16Array)
- [ ] WAV encoder (PCM → WAV dengan header RIFF)
- [ ] MP3 encoding (opsional, untuk output format lain)
- [ ] OGG handling (opsional)
- [ ] Metadata extraction (duration, sample rate, channels)
- [ ] Waveform data extraction (untuk visualisasi)
- [ ] Audio normalization (opsional)

### PHASE 5 — AI Agent
- [ ] LLM chat endpoint: `POST /api/agent/chat`
- [ ] System instruction builder (persona → system prompt)
- [ ] Persona definitions (Mas Budi, Ceu Edah, Reporter, VA)
- [ ] "Jadikan Suara" flow (agent text response → TTS)
- [ ] Chat history management (in-memory atau database)

### PHASE 6 — Frontend (dari TTS.md)
- [ ] Tab 1: TTS Studio — preset grid, voice select, text input, audio output, waveform
- [ ] Tab 2: Voice AI Agent — chat window, persona select, speak button
- [ ] Tab 3: Drama/Podcast — dual-speaker config, dialogue editor, multi-speaker output
- [ ] Tab 4: Audio Library — history list, play, download
- [ ] Responsive design (mobile bottom tabs)
- [ ] Glassmorphism UI style dari TTS.md
- [ ] **Penting:** Semua API calls ke `/api/*` (bukan ke provider langsung)

### PHASE 7 — MCP / Skills / Plugins (MVP Skip)
- [ ] Hanya implement jika ada use case nyata
- [ ] Contoh potensial: audio caching, batch processing, webhook notifications

### PHASE 8 — Testing & Production
- [ ] Unit tests: provider adapters, audio engine, TTS engine
- [ ] Integration tests: API endpoints
- [ ] E2E tests: full TTS flow
- [ ] Rate limiting & abuse prevention
- [ ] Usage tracking & logging
- [ ] Error handling & monitoring
- [ ] Docker deployment (`docker-compose.yml`)
- [ ] Environment variable management
- [ ] API key rotation strategy
- [ ] Cost monitoring / budget alerts

---

## Server API Design

Framework: **Hono** (recommended, ringan, TypeScript-first) atau Express

### Endpoints

| Method | Path | Fungsi |
|---|---|---|
| `POST` | `/api/tts/generate` | Generate TTS audio (single/multi-speaker) |
| `POST` | `/api/agent/chat` | AI Agent chat (LLM) |
| `GET` | `/api/models` | List available models + capabilities |
| `GET` | `/api/voices` | List available voices |
| `GET` | `/api/presets` | List dialect presets |
| `GET` | `/api/health` | Health check |

### Authentication
- API key management di server (`.env`), tidak di browser
- Rate limiting per IP/session
- Usage logging untuk cost tracking

---

## Catatan Penting

1. **TTS.md adalah prototipe UI**, bukan production code. Kode JavaScript di dalamnya memanggil Gemini API langsung dari browser — ini tidak boleh dipakai di production.

2. **sources/ adalah referensi**, bukan dependency. Jangan `import` langsung dari folder ini. Ambil pola/konsep, implementasi sendiri.

3. **Jangan over-engineer untuk MVP.** Packages minimal (core, providers, tts-engine, audio-engine). Tambahkan复杂itas setelah MVP jalan.

4. **Google Gemini API pattern berbeda dari OpenAI.** OpenAI pakai SDK `openai.audio.speech.create()`, Gemini pakai raw HTTP POST ke `generateContent` endpoint. Provider abstraction harus menangani keduanya.

5. **Audio dari Gemini adalah PCM 16-bit raw**, bukan WAV. Audio Engine harus handle konversi ini (seperti yang sudah diimplementasi di TTS.md secara inline).
