# Nusantara Voice AI

Text-to-Speech & Multi-Dialect AI Studio — aplikasi untuk mengkonversi teks menjadi suara dengan dukungan multi-dialek bahasa Indonesia, AI Agent, dan pembuatan podcast/drama multi-speaker.

## Fitur

- **TTS Studio** — Konversi teks ke suara dengan 6 preset dialek (Jawa Medok, Sunda Halus, Berita Formal, dll)
- **Voice AI Agent** — Chat dengan AI yang bisa menjawab menggunakan suara (Mas Budi, Ceu Edah, Reporter, VA)
- **Drama/Podcast** — Buat dialog multi-speaker, generate naskah via LLM, render audio
- **Audio Library** — Kelola file audio yang sudah dibuat

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 + Vite + TypeScript |
| Server | Hono (TypeScript) |
| Monorepo | pnpm workspaces + Turborepo |
| Providers | Gemini, OpenAI, OpenRouter |
| Audio | PCM/WAV codec, normalization, waveform visualization |
| Testing | Vitest (91 tests) |
| CI/CD | GitHub Actions |
| Docker | Multi-stage build |

## Struktur Project

```
Text_To_Voice/
├── apps/web/              # Vue 3 frontend
├── server/api/            # Hono API server
├── packages/
│   ├── core/              # Types, presets, plugins, skills
│   ├── providers/         # Gemini, OpenAI, OpenRouter, AgentService
│   ├── tts-engine/        # TTS orchestration
│   └── audio-engine/      # PCM/WAV codec, normalization
├── Dockerfile
├── docker-compose.yml
└── vitest.config.ts
```

## Instalasi

### Prasyarat

- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Setup

```bash
# Clone repository
git clone https://github.com/denboy-broden/Text_To_Voice.git
cd Text_To_Voice

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env — isi minimal salah satu API key:
#   GEMINI_API_KEY=your_key
#   OPENAI_API_KEY=your_key
```

### Development

```bash
# Jalankan server (port 3001)
cd server/api && pnpm dev

# Jalankan frontend (port 3000) — terminal terpisah
cd apps/web && pnpm dev

# Buka http://localhost:3000
```

### Docker

```bash
docker-compose up --build
```

## Scripts

```bash
pnpm dev          # Start all services
pnpm build        # Build all packages
pnpm test         # Run 91 unit tests
pnpm test:watch   # Watch mode
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier format
pnpm typecheck    # TypeScript check
```

## API Endpoints

| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/tts/generate` | Generate TTS single speaker |
| POST | `/api/tts/multi-speaker` | Generate TTS multi-speaker |
| POST | `/api/batch/tts` | Batch TTS paralel |
| POST | `/api/agent/session` | Buat sesi chat agent |
| POST | `/api/agent/chat` | Kirim pesan ke agent |
| POST | `/api/agent/speak` | Konversi teks agent ke suara |
| GET | `/api/agent/personas` | List persona agent |
| GET | `/api/models` | List models, voices, presets |
| GET | `/api/plugins` | List registered plugins |
| GET | `/api/health` | Health check |

## Provider

| Provider | TTS | LLM | Auto-Selection |
|----------|-----|-----|----------------|
| Gemini | gemini-2.5-flash-preview-tts | gemini-3-flash-preview | Priority 1 |
| OpenAI | tts-1, tts-1-hd, gpt-4o-mini-tts | gpt-4o-mini | Priority 2 |
| OpenRouter | Via compatible API | Via compatible API | Priority 3 |

## License

See [NOTICE](NOTICE) untuk informasi lisensi dependency.
