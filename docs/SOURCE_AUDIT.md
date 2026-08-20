# SOURCE_AUDIT.md — Hasil Audit sources/

Tanggal audit: 21 Agustus 2026

---

## Ringkasan

| Source | Lisensi | Bahasa | Relevansi | Aksi |
|---|---|---|---|---|
| openai-node-main | Apache 2.0 | TypeScript | **Tinggi** | Ambil pola adapter + TTS types |
| wavefile-master | MIT | Ruby | **Tinggi** | Ambil konsep WAV chunk processing |
| deprecated-generative-ai-js-main | Apache 2.0 | TypeScript | **Sedang** | Ambil pola API call Gemini |
| typescript-starter-master | MIT (NestJS) | TypeScript | **Sedang** | Ambil tsconfig + project structure |
| turborepo-main | MIT | Rust/TS | **Rendah** | Install via npm, jangan clone |
| python-sdk-main | Apache 2.0 | Python | **Rendah** | Info only |
| awesome-compose-master | CC0 1.0 | YAML/MD | **Rendah** | Buat docker-compose sendiri |
| boilerplate-main | MIT | HTML/JS | **Rendah** | Skip |

**Prinsip:** Jangan copy source code ke production. Ambil pola/konsep, periksa lisensi, implementasi sendiri dalam TypeScript.

---

## 1. openai-node-main ★★★

**Repo:** OpenAI Node.js SDK
**Lisensi:** Apache 2.0 (Copyright 2026 OpenAI)
**Ijin:** Komersial ✅, Modify ✅, Distribute ✅, Attribution required

### Isi yang Relevan

#### TTS Types (`src/resources/audio/speech.ts`)

```typescript
// Model TTS yang tersedia
type SpeechModel = 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts' | 'gpt-4o-mini-tts-2025-12-15';

// Parameter request TTS
interface SpeechCreateParams {
  input: string;                    // Max 4096 karakter
  model: (string & {}) | SpeechModel;
  voice: string
      | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo'
      | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar'
      | { id: string };             // Custom voice
  instructions?: string;            // Voice instructions (hanya gpt-4o-mini-tts)
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  speed?: number;                   // 0.25 - 4.0
  stream_format?: 'sse' | 'audio';
}
```

#### API Pattern

```
POST /audio/speech
Headers: Authorization: Bearer {apiKey}
Body: { model, voice, input, instructions?, response_format?, speed? }
Response: binary audio (application/octet-stream)
```

- Response **bukan JSON** — langsung binary audio stream
- Support streaming via `response.body` (ReadableStream)
- Support buffered via `response.arrayBuffer()`

#### Pola yang Diadopsi

1. **Provider adapter pattern** — OpenAI client → `.audio.speech.create()` → binary response
2. **Error handling** — structured APIError class
3. **Type safety** — semua params typed, voice selection typed
4. **Streaming support** — `response.body` untuk streaming ke file/player

---

## 2. wavefile-master ★★★

**Repo:** Wavefile Ruby gem
**Lisensi:** MIT (Copyright 2009-22 Joel Strait)
**Ijin:** Komersial ✅, Modify ✅, Distribute ✅, Attribution appreciated

### Isi yang Relevan

#### WAV Chunk Structure

```
RIFF Header (12 bytes)
├── "RIFF" (4 bytes)
├── File size - 8 (uint32 LE)
└── "WAVE" (4 bytes)

fmt Sub-chunk (16+ bytes)
├── "fmt " (4 bytes)
├── Chunk size (uint32 LE) = 16 untuk PCM
├── Audio format (uint16 LE): 1=PCM, 3=Float, 65534=Extensible
├── Channels (uint16 LE)
├── Sample rate (uint32 LE)
├── Byte rate (uint32 LE) = SampleRate × Channels × BytesPerSample
├── Block align (uint16 LE) = Channels × BytesPerSample
└── Bits per sample (uint16 LE)

[fact Sub-chunk] (non-PCM only, 12 bytes)
├── "fact" (4 bytes)
├── Chunk size = 4
└── Sample frames count (uint32 LE)

data Sub-chunk
├── "data" (4 bytes)
├── Data size (uint32 LE)
└── Audio samples (PCM/Float data)
```

#### Format Codes

| Code | Nama | Deskripsi |
|---|---|---|
| 1 | PCM | Linear PCM (8/16/24/32-bit) |
| 3 | IEEE Float | 32-bit atau 64-bit float |
| 65534 | WAVE_FORMAT_EXTENSIBLE | Multi-channel atau non-standard |

#### Sample Rates & Bit Depths

| Bit Depth | Tipe Data | Range |
|---|---|---|
| 8-bit PCM | Unsigned byte (0-255) | Offset binary |
| 16-bit PCM | Signed int16 LE | -32768 to 32767 |
| 24-bit PCM | Signed int24 LE (3 bytes) | Manual packing |
| 32-bit PCM | Signed int32 LE | Standard |
| 32-bit Float | IEEE 754 float LE | -1.0 to 1.0 |
| 64-bit Float | IEEE 754 double LE | -1.0 to 1.0 |

#### Pola yang Diadopsi

1. **Chunk-based reading/writing** — iterate through chunks, dispatch by ID
2. **Header placeholder pattern** — tulis header dengan size=0, tulis data, kembali ke awal untuk fix size
3. **24-bit manual packing** — karena tidak ada native 24-bit di JS, perlu manual pack/unpack
4. **Odd-byte padding** — RIFF spec: chunk size harus genap, tambah padding byte jika ganjil
5. **Format conversion** — buffer conversion antar format (PCM 16 → Float 32, dll)

---

## 3. deprecated-generative-ai-js-main ★★☆

**Repo:** Google Generative AI JavaScript SDK (deprecated)
**Lisensi:** Apache 2.0 (Copyright Google)
**Ijin:** Komersial ✅, Modify ✅, Distribute ✅, Attribution required

### Isi yang Relevan

#### API Pattern Gemini

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:{task}
Headers:
  Content-Type: application/json
  x-goog-api-key: {apiKey}
Body: { contents, generationConfig, systemInstruction? }
Response: JSON (candidates, usageMetadata)
```

#### TTS Pattern (dari TTS.md, bukan SDK ini)

SDK ini **tidak punya dedicated TTS API**. TTS dilakukan melalui `generateContent()` dengan:

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

Response audio dikembalikan sebagai `inlineData` dalam response:

```
result.candidates[0].content.parts[0].inlineData.data   // base64 encoded PCM
result.candidates[0].content.parts[0].inlineData.mimeType // "audio/L16;rate=24000"
```

#### Multi-Speaker Pattern

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

#### Pola yang Diadopsi

1. **Raw HTTP POST** — Gemini tidak pakai SDK wrapper untuk TTS, langsung fetch ke endpoint
2. **Base64 audio response** — audio dikembalikan sebagai base64 dalam JSON (bukan binary stream)
3. **PCM output** — Gemini mengembalikan PCM 16-bit 24kHz, bukan WAV
4. **System instruction** — untuk AI Agent, gunakan `systemInstruction` field

---

## 4. typescript-starter-master ★★☆

**Repo:** NestJS TypeScript starter
**Lisensi:** MIT (Copyright NestJS)
**Ijin:** Komersial ✅, Modify ✅, Distribute ✅

### Isi yang Relevan

- TypeScript project structure
- `tsconfig.json` patterns
- Testing setup (Jest)
- Build/compile scripts

### Pola yang Diadopsi

1. **tsconfig strict mode** — untuk type safety
2. **Project structure** — `src/`, `test/`, config files
3. **NestJS patterns** — hanya jika pakai NestJS sebagai server framework

---

## 5. turborepo-main ★☆☆

**Repo:** Turborepo (monorepo build tool)
**Lisensi:** MIT (Copyright Vercel)
**Ijin:** Komersial ✅

### Isi

Rust + TypeScript source code untuk Turborepo build system.

### Aksi

**Install via npm** (`turbo` dev dependency), jangan clone repo ini. Monorepo management cukup pakai:
- `pnpm-workspace.yaml` untuk workspace definition
- `turbo.json` untuk task pipeline
- `turbo` CLI dari npm

---

## 6. python-sdk-main ★☆☆

**Repo:** OpenAI Python SDK
**Lisensi:** Apache 2.0

### Aksi

**Info only.** Project ini pakai TypeScript. Python SDK hanya berguna sebagai referensi API behavior, bukan kode.

---

## 7. awesome-compose-master ★☆☆

**Repo:** Docker Compose examples collection
**Lisensi:** CC0 1.0 (Public Domain)

### Aksi

**Buat docker-compose.yml sendiri.** Tidak perlu reference repo ini. Cukup:
- App service (Node.js)
- Redis (jika perlu caching)
- Nginx (reverse proxy, optional)

---

## 8. boilerplate-main ★☆☆

**Repo:** HTML5 Boilerplate
**Lisensi:** MIT

### Aksi

**Skip.** Tidak relevan dengan project TypeScript monorepo ini.

---

## Kesimpulan Aksi

### Yang Perlu Diambil ke Production Code

| Dari | Ambil | Implementasi di |
|---|---|---|
| openai-node-main | `SpeechCreateParams` type pattern | `packages/providers/src/types.ts` |
| openai-node-main | Provider adapter pattern | `packages/providers/src/openai-provider.ts` |
| openai-node-main | Binary response handling | `packages/providers/src/base-provider.ts` |
| wavefile-master | WAV header chunk structure | `packages/audio-engine/src/wav-encoder.ts` |
| wavefile-master | PCM pack/unpack patterns | `packages/audio-engine/src/pcm-codec.ts` |
| wavefile-master | RIFF header placeholder pattern | `packages/audio-engine/src/wav-encoder.ts` |
| deprecated-generative-ai-js-main | Gemini API call pattern | `packages/providers/src/gemini-provider.ts` |
| deprecated-generative-ai-js-main | Base64 audio extraction | `packages/audio-engine/src/pcm-decoder.ts` |

### Yang Tidak Perlu Diambil

| Source | Alasan |
|---|---|
| python-sdk-main | Bahasa beda (Python vs TypeScript) |
| turborepo-main | Install via npm, bukan source code |
| awesome-compose-main | Buat sendiri, lebih sederhana |
| boilerplate-main | Tidak relevan |
| typescript-starter-master | Hanya ambil tsconfig pattern, bukan full NestJS |

### Lisensi Compliance

Semua source yang relevan menggunakan lisensi permissive:
- **Apache 2.0** (OpenAI, Google) — perlu attribution di NOTICE file
- **MIT** (wavefile, turborepo, NestJS) — perlu attribution di LICENSE file
- **CC0** (awesome-compose) — public domain, tidak perlu attribution

**Action item:** Buat `NOTICE` file di root project yang mencantumkan attributions untuk semua dependencies yang diambil polanya.
