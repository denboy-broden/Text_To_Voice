<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Denboy Voice Studio</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#f0fdfa',
                            100: '#ccfbf1',
                            500: '#14b8a6',
                            600: '#0d9488',
                            700: '#0f766e',
                            900: '#134e4a',
                        },
                        accent: {
                            500: '#8b5cf6',
                            600: '#7c3aed',
                        }
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <!-- Google Fonts & FontAwesome Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0b0f19;
            color: #f3f4f6;
        }
        /* Glassmorphism custom styling */
        .glass-panel {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-card {
            background: rgba(31, 41, 55, 0.6);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.6);
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(20, 184, 166, 0.4);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(20, 184, 166, 0.7);
        }
        /* Pulse Animation */
        @keyframes glowing {
            0% { box-shadow: 0 0 5px rgba(20, 184, 166, 0.2); }
            50% { box-shadow: 0 0 20px rgba(20, 184, 166, 0.6); }
            100% { box-shadow: 0 0 5px rgba(20, 184, 166, 0.2); }
        }
        .glow-active {
            animation: glowing 2s infinite;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between antialiased selection:bg-brand-500 selection:text-white">

    <!-- Header Navigation Bar -->
    <header class="glass-panel sticky top-0 z-50 border-b border-gray-800 px-4 lg:px-8 py-3">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                    <i class="fa-solid font-bold fa-microphone-lines text-white text-xl"></i>
                </div>
                <div>
                    <h1 class="text-lg font-bold bg-gradient-to-r from-white via-gray-200 to-brand-500 bg-clip-text text-transparent">
                        Nusantara Voice AI
                    </h1>
                    <p class="text-xs text-gray-400">Text-to-Speech & Multi-Dialect AI Studio</p>
                </div>
            </div>

            <!-- Main Tabs Header Navigation -->
            <nav class="hidden md:flex items-center bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                <button onclick="switchTab('tts')" id="tab-tts-btn" class="tab-btn px-4 py-2 text-sm font-medium rounded-lg text-white bg-brand-600 transition-all flex items-center gap-2">
                    <i class="fa-solid fa-wand-magic-sparkles text-xs"></i> TTS Studio
                </button>
                <button onclick="switchTab('agent')" id="tab-agent-btn" class="tab-btn px-4 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2">
                    <i class="fa-solid fa-robot text-xs"></i> Voice AI Agent
                </button>
                <button onclick="switchTab('multispeaker')" id="tab-multispeaker-btn" class="tab-btn px-4 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2">
                    <i class="fa-solid fa-comments text-xs"></i> Drama / Podcast
                </button>
                <button onclick="switchTab('library')" id="tab-library-btn" class="tab-btn px-4 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2">
                    <i class="fa-solid fa-folder-open text-xs"></i> Perpustakaan Audio
                </button>
            </nav>

            <!-- API Status Badge -->
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Gemini 2.5 TTS Active
                </span>
            </div>
        </div>
        
        <!-- Mobile Bottom Tab Navigation -->
        <div class="flex md:hidden justify-around pt-3 border-t border-gray-800/80 mt-2">
            <button onclick="switchTab('tts')" id="mob-tab-tts" class="text-xs text-brand-500 flex flex-col items-center gap-1 font-medium">
                <i class="fa-solid fa-wand-magic-sparkles"></i> TTS Studio
            </button>
            <button onclick="switchTab('agent')" id="mob-tab-agent" class="text-xs text-gray-400 flex flex-col items-center gap-1 font-medium">
                <i class="fa-solid fa-robot"></i> AI Agent
            </button>
            <button onclick="switchTab('multispeaker')" id="mob-tab-multispeaker" class="text-xs text-gray-400 flex flex-col items-center gap-1 font-medium">
                <i class="fa-solid fa-comments"></i> Drama
            </button>
            <button onclick="switchTab('library')" id="mob-tab-library" class="text-xs text-gray-400 flex flex-col items-center gap-1 font-medium">
                <i class="fa-solid fa-folder-open"></i> Library
            </button>
        </div>
    </header>

    <!-- Main Content Container -->
    <main class="max-w-7xl w-full mx-auto p-4 lg:p-8 flex-1">

        <!-- TAB 1: TTS STUDIO -->
        <div id="tab-tts" class="tab-content grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <!-- Left Side: Controls & Dialects -->
            <div class="lg:col-span-5 flex flex-col gap-5">
                <div class="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                        <h2 class="text-base font-semibold text-white flex items-center gap-2">
                            <i class="fa-solid fa-sliders text-brand-500"></i> Pengaturan Logat & Suara
                        </h2>
                        <span class="text-xs text-gray-400">Pilih Karakter & Dialek</span>
                    </div>

                    <!-- Preset Dialek / Logat Daerah -->
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                            Preset Logat & Gaya Bicara
                        </label>
                        <div class="grid grid-cols-2 gap-2" id="preset-grid">
                            <button onclick="selectPreset('jawa')" id="preset-jawa" class="preset-card text-left p-2.5 rounded-xl border border-brand-500 bg-brand-500/10 text-white transition-all">
                                <div class="text-sm font-semibold text-brand-400">🌾 Jawa Medok</div>
                                <div class="text-[10px] text-gray-400">Dialek Jawa Kental & Warm</div>
                            </button>
                            <button onclick="selectPreset('sunda')" id="preset-sunda" class="preset-card text-left p-2.5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 text-gray-300 transition-all">
                                <div class="text-sm font-semibold text-emerald-400">🍃 Sunda Halus</div>
                                <div class="text-[10px] text-gray-400">Intonasi Mengayun Merdu</div>
                            </button>
                            <button onclick="selectPreset('gaul')" id="preset-gaul" class="preset-card text-left p-2.5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 text-gray-300 transition-all">
                                <div class="text-sm font-semibold text-purple-400">😎 Jakarta / Gaul</div>
                                <div class="text-[10px] text-gray-400">Santai & Ekspresif</div>
                            </button>
                            <button onclick="selectPreset('formal')" id="preset-formal" class="preset-card text-left p-2.5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 text-gray-300 transition-all">
                                <div class="text-sm font-semibold text-blue-400">📺 Pembaca Berita</div>
                                <div class="text-[10px] text-gray-400">Wibawa, Jelas & Formal</div>
                            </button>
                            <button onclick="selectPreset('dongeng')" id="preset-dongeng" class="preset-card text-left p-2.5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 text-gray-300 transition-all">
                                <div class="text-sm font-semibold text-amber-400">📖 Pendongeng</div>
                                <div class="text-[10px] text-gray-400">Hangat & Imajinatif</div>
                            </button>
                            <button onclick="selectPreset('anime')" id="preset-anime" class="preset-card text-left p-2.5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 text-gray-300 transition-all">
                                <div class="text-sm font-semibold text-pink-400">✨ Ceria / Energetik</div>
                                <div class="text-[10px] text-gray-400">Penuh Semangat</div>
                            </button>
                        </div>
                    </div>

                    <!-- Voice Character Selection -->
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                            Pilih Model Suara Karakter
                        </label>
                        <select id="voice-name" class="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none">
                            <option value="Kore">Kore (Wanita - Tegas & Jelas)</option>
                            <option value="Puck">Puck (Pria - Energetik & Ramah)</option>
                            <option value="Zephyr">Zephyr (Wanita - Cerah & Hangat)</option>
                            <option value="Charon">Charon (Pria - Dalam & Wibawa)</option>
                            <option value="Aoede">Aoede (Wanita - Merdu & Santai)</option>
                            <option value="Fenrir">Fenrir (Pria - Bertenaga & Antusias)</option>
                            <option value="Leda">Leda (Wanita - Muda & Halus)</option>
                            <option value="Sulafat">Sulafat (Wanita - Hangat & Lembut)</option>
                            <option value="Vindemiatrix">Vindemiatrix (Wanita - Lembut & Tenang)</option>
                            <option value="Algieba">Algieba (Pria - Smooth & Khas)</option>
                        </select>
                    </div>

                    <!-- Tone & Speed Modifiers -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-gray-400 mb-1">Kecepatan Bicara</label>
                            <select id="speed-modifier" class="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-xl p-2.5 outline-none">
                                <option value="santai dan agak lambat">Slow / Santai</option>
                                <option value="kecepatan normal dan natural" selected>Normal / Natural</option>
                                <option value="agak cepat dan bersemangat">Fast / Cepat</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-400 mb-1">Emosi Suara</label>
                            <select id="emotion-modifier" class="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-xl p-2.5 outline-none">
                                <option value="ramah dan ceria" selected>😊 Ceria / Ramah</option>
                                <option value="serius dan terpercaya">😐 Serius / Formal</option>
                                <option value="humoris dan hangat">😄 Humoris / Warm</option>
                                <option value="misterius dan berbisik">🤫 Misterius / Whisper</option>
                            </select>
                        </div>
                    </div>

                    <!-- Instruction Prompt Customizer -->
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            Instruksi Gaya Bicara Khusus (Custom Prompt)
                        </label>
                        <textarea id="custom-prompt" rows="2" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-gray-300 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Contoh: Ucapkan dengan intonasi logat Jawa medok khas Jogja/Solo yang sangat sopan..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Right Side: Text Input & Audio Output -->
            <div class="lg:col-span-7 flex flex-col gap-5">
                <div class="glass-panel p-5 rounded-2xl flex flex-col gap-4 flex-1">
                    <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                        <h2 class="text-base font-semibold text-white flex items-center gap-2">
                            <i class="fa-solid fa-pen-to-square text-brand-500"></i> Naskah / Teks Masukan
                        </h2>
                        <!-- Sample Presets Dropdown -->
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-400">Contoh Naskah:</span>
                            <button onclick="loadSampleText('jawa')" class="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">Jawa</button>
                            <button onclick="loadSampleText('sunda')" class="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">Sunda</button>
                            <button onclick="loadSampleText('berita')" class="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">Berita</button>
                        </div>
                    </div>

                    <!-- Text Area -->
                    <div class="relative flex-1 min-h-[180px]">
                        <textarea id="tts-input-text" class="w-full h-full bg-gray-900/90 border border-gray-700/80 rounded-xl p-4 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-brand-500 outline-none resize-none" placeholder="Ketik atau tempelkan teks yang ingin diubah menjadi suara di sini... (Bisa Bahasa Indonesia, campuran bahasa daerah Jawa, Sunda, dll)"></textarea>
                        <div class="absolute bottom-3 right-3 text-xs text-gray-500" id="char-count">0 Karakter</div>
                    </div>

                    <!-- Submit Button -->
                    <button id="generate-speech-btn" onclick="generateSpeech()" class="w-full py-3.5 px-6 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 text-sm">
                        <i class="fa-solid fa-volume-high"></i> Hasilkan Suara (Generate Speech)
                    </button>
                </div>

                <!-- Audio Output Card -->
                <div id="audio-output-card" class="glass-panel p-5 rounded-2xl hidden flex-col gap-4 border-brand-500/30">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-2">
                            <i class="fa-solid fa-circle-check text-emerald-400"></i> Audio Berhasil Dihasilkan
                        </span>
                        <a id="download-audio-link" download="audio-nusantara.wav" class="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5">
                            <i class="fa-solid fa-download"></i> Unduh WAV
                        </a>
                    </div>

                    <!-- Waveform Visualizer Canvas -->
                    <div class="bg-gray-900 rounded-xl p-3 border border-gray-800 flex items-center justify-center">
                        <canvas id="waveform-canvas" class="w-full h-16"></canvas>
                    </div>

                    <!-- Custom HTML Audio Player -->
                    <audio id="main-audio-player" controls class="w-full h-10 accent-brand-500 rounded-lg outline-none"></audio>
                </div>
            </div>
        </div>

        <!-- TAB 2: EMBEDDED AI VOICE AGENT -->
        <div id="tab-agent" class="tab-content hidden grid-cols-1 lg:grid-cols-12 gap-6">
            
            <!-- Agent Control & Sidebar -->
            <div class="lg:col-span-4 flex flex-col gap-4">
                <div class="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                    <div class="flex items-center gap-3 border-b border-gray-800 pb-3">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-600 to-brand-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-accent-500/20">
                            <i class="fa-solid fa-robot"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-white">Nusantara Voice Agent</h3>
                            <p class="text-xs text-brand-400">Asisten Pintar Naskah & Dialek</p>
                        </div>
                    </div>

                    <p class="text-xs text-gray-300 leading-relaxed">
                        AI Agent ini dapat menjawab pertanyaan, membuat naskah podcast, mengodekan bahasa ke dialek Jawa/Sunda medok, dan **secara otomatis berbicara merespons Anda**!
                    </p>

                    <!-- Agent Persona Quick Selection -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-400 mb-2">Peran & Gaya Agent</label>
                        <select id="agent-persona" class="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-xl p-2.5 outline-none">
                            <option value="jawa_medok">🌾 Mas Budi - Asisten Medok Jawa</option>
                            <option value="sunda_halus">🍃 Ceu Edah - Asisten Sunda Supel</option>
                            <option value="pembaca_berita">📰 Reporter Berita Nusantara</option>
                            <option value="asisten_sopan">🤖 Virtual Assistant Profesional</option>
                        </select>
                    </div>

                    <div class="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                        <div class="flex items-center gap-2 text-xs font-semibold text-brand-400 mb-1">
                            <i class="fa-solid fa-lightbulb"></i> Fitur AI Agent:
                        </div>
                        <ul class="text-[11px] text-gray-300 space-y-1 list-disc list-inside">
                            <li>Membuat cerita pendek atau humor daerah.</li>
                            <li>Menerjemahkan teks biasa menjadi bahasa Jawa Medok / Krama.</li>
                            <li>Tinggal klik 'Jadikan Suara' pada pesan balasan agent.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Chat Window -->
            <div class="lg:col-span-8 flex flex-col glass-panel rounded-2xl h-[550px]">
                <!-- Chat Header -->
                <div class="p-4 border-b border-gray-800 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                        <span class="text-sm font-semibold text-white">Ruang Diskusi AI Agent</span>
                    </div>
                    <button onclick="clearChat()" class="text-xs text-gray-400 hover:text-red-400 transition">
                        <i class="fa-solid fa-trash-can"></i> Bersihkan Chat
                    </button>
                </div>

                <!-- Chat Messages Stream -->
                <div id="chat-messages" class="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                    <!-- Default Greeting from AI Agent -->
                    <div class="flex gap-3 max-w-[85%]">
                        <div class="w-8 h-8 rounded-full bg-accent-600 flex items-center justify-center text-white text-xs shrink-0">
                            <i class="fa-solid fa-robot"></i>
                        </div>
                        <div class="bg-gray-800 text-gray-200 p-3.5 rounded-2xl rounded-tl-none text-xs leading-relaxed border border-gray-700/50">
                            Sugeng rawuh! Halo, saya <b>Nusantara Voice AI Agent</b>. Ada naskah atau percakapan apa yang ingin kita buat hari ini? Saya bisa bantu buat naskah lucu Jawa medok, berita, atau cerita rakyat!
                        </div>
                    </div>
                </div>

                <!-- Chat Input Form -->
                <div class="p-3 border-t border-gray-800 bg-gray-900/60 rounded-b-2xl">
                    <form onsubmit="sendAgentMessage(event)" class="flex items-center gap-2">
                        <input id="agent-input-text" type="text" class="flex-1 bg-gray-900 border border-gray-700 text-xs text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Tulis pesan atau minta AI Agent membuat naskah...">
                        <button type="submit" id="send-agent-btn" class="px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5">
                            <span>Kirim</span>
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- TAB 3: DRAMA / PODCAST MULTI-SPEAKER -->
        <div id="tab-multispeaker" class="tab-content hidden grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-5 flex flex-col gap-4">
                <div class="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                    <h3 class="text-base font-bold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
                        <i class="fa-solid fa-people-arrows text-brand-500"></i> Pengaturan Percakapan Dual-Voice
                    </h3>

                    <p class="text-xs text-gray-400">
                        Buat percakapan dramatis atau dialog podcast antara dua penutur dengan gaya suara berbeda.
                    </p>

                    <!-- Speaker 1 Config -->
                    <div class="p-3 bg-gray-900/80 rounded-xl border border-gray-800 flex flex-col gap-2">
                        <span class="text-xs font-semibold text-brand-400 flex items-center gap-1">
                            <i class="fa-solid fa-user"></i> Penutur 1 (Speaker1)
                        </span>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="text-[10px] text-gray-400">Suara Basis</label>
                                <select id="spk1-voice" class="w-full bg-gray-800 text-xs text-white p-2 rounded-lg outline-none border border-gray-700">
                                    <option value="Kore" selected>Kore (Wanita - Firm)</option>
                                    <option value="Puck">Puck (Pria - Upbeat)</option>
                                    <option value="Charon">Charon (Pria - Deep)</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-[10px] text-gray-400">Logat / Style</label>
                                <select id="spk1-accent" class="w-full bg-gray-800 text-xs text-white p-2 rounded-lg outline-none border border-gray-700">
                                    <option value="Jawa Medok">Logat Jawa Medok</option>
                                    <option value="Sunda">Logat Sunda</option>
                                    <option value="Jakarta Gaul">Jakarta Gaul</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Speaker 2 Config -->
                    <div class="p-3 bg-gray-900/80 rounded-xl border border-gray-800 flex flex-col gap-2">
                        <span class="text-xs font-semibold text-accent-500 flex items-center gap-1">
                            <i class="fa-solid fa-user"></i> Penutur 2 (Speaker2)
                        </span>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="text-[10px] text-gray-400">Suara Basis</label>
                                <select id="spk2-voice" class="w-full bg-gray-800 text-xs text-white p-2 rounded-lg outline-none border border-gray-700">
                                    <option value="Puck" selected>Puck (Pria - Upbeat)</option>
                                    <option value="Zephyr">Zephyr (Wanita - Bright)</option>
                                    <option value="Fenrir">Fenrir (Pria - Excitable)</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-[10px] text-gray-400">Logat / Style</label>
                                <select id="spk2-accent" class="w-full bg-gray-800 text-xs text-white p-2 rounded-lg outline-none border border-gray-700">
                                    <option value="Jakarta Gaul" selected>Jakarta Gaul</option>
                                    <option value="Jawa Medok">Logat Jawa Medok</option>
                                    <option value="Formal">Formal News</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button onclick="loadSampleConversation()" class="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 rounded-xl transition">
                        <i class="fa-solid fa-file-lines text-brand-400"></i> Muat Naskah Contoh Podcast
                    </button>
                </div>
            </div>

            <!-- Dialogue Text Editor & Generator -->
            <div class="lg:col-span-7 flex flex-col gap-4">
                <div class="glass-panel p-5 rounded-2xl flex flex-col gap-3 flex-1">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i class="fa-solid fa-align-left text-brand-500"></i> Naskah Percakapan Format Multi-Speaker
                    </h3>
                    <p class="text-xs text-gray-400">Format naskah menggunakan awalan <b>Speaker1:</b> dan <b>Speaker2:</b></p>

                    <textarea id="dialogue-text-input" rows="10" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3.5 text-xs text-gray-200 focus:ring-2 focus:ring-brand-500 outline-none resize-none font-mono" placeholder="Speaker1: Halo mas, pripun kabare dina iki?&#10;Speaker2: Wah luar biasa bro, makin semangat buat konten AI studio ini!"></textarea>

                    <button id="generate-dialogue-btn" onclick="generateMultiSpeakerAudio()" class="py-3 px-5 bg-gradient-to-r from-accent-600 to-brand-600 hover:from-accent-500 hover:to-brand-500 text-white font-semibold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                        <i class="fa-solid fa-play"></i> Hasilkan Audio Percakapan (Podcast)
                    </button>
                </div>

                <!-- Multi Speaker Audio Result -->
                <div id="multi-audio-card" class="glass-panel p-4 rounded-2xl hidden flex-col gap-3 border-accent-500/30">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-accent-400"><i class="fa-solid fa-circle-check"></i> Audio Percakapan Siap</span>
                        <a id="download-multi-link" download="podcast-nusantara.wav" class="px-3 py-1 bg-accent-600 text-white text-xs rounded-lg">Download WAV</a>
                    </div>
                    <audio id="multi-audio-player" controls class="w-full accent-accent-500"></audio>
                </div>
            </div>
        </div>

        <!-- TAB 4: AUDIO LIBRARY / HISTORY -->
        <div id="tab-library" class="tab-content hidden flex-col gap-4">
            <div class="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                    <div>
                        <h3 class="text-base font-bold text-white">Perpustakaan & Riwayat Audio</h3>
                        <p class="text-xs text-gray-400">Daftar audio yang telah Anda hasilkan dalam sesi ini</p>
                    </div>
                    <button onclick="clearHistory()" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs rounded-lg transition">
                        Hapus Semua Riwayat
                    </button>
                </div>

                <div id="history-list" class="flex flex-col gap-3">
                    <!-- Dynamic audio history items will be injected here -->
                    <div class="text-center py-10 text-gray-500 text-xs" id="empty-history-msg">
                        Belum ada audio yang dibuat. Silakan gunakan tab <b>TTS Studio</b> atau <b>AI Agent</b>!
                    </div>
                </div>
            </div>
        </div>

    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-800/80 py-4 px-4 text-center text-xs text-gray-500">
        <p>Powered by Google Gemini 2.5 Flash TTS & Gemini 3 Flash API | Nusantara Voice AI Studio &copy; 2026</p>
    </footer>

    <script>
        // Global State & Presets
        let currentPreset = 'jawa';
        let audioHistory = [];
        let audioCtx = null;
        let activeSourceNode = null;

        // Dialect Presets Definitions
        const PRESETS = {
            jawa: {
                name: 'Jawa Medok',
                voice: 'Kore',
                customInstruction: 'Ucapkan kalimat berikut dalam bahasa Indonesia dengan gaya dan logat Jawa medok yang kental, hangat, dan sangat khas, gunakan intonasi pengucapan khas Jawa (pripun/medok):',
                sample: 'Sugeng rawuh sedulur kabeh! Selamat datang di aplikasi Nusantara Voice AI. Piye kabare? Semoga sampeyan kabeh senantiasa sehat lan sukses selalu nggih!'
            },
            sunda: {
                name: 'Sunda Halus',
                voice: 'Aoede',
                customInstruction: 'Ucapkan dalam bahasa Indonesia dengan logat Sunda yang halus, mengayun, merdu, ramah, dan khas Priangan:',
                sample: 'Sampurasun wargi sadayana! Wilujeng sumping di studio audio AI. Mugi-mugi dinten ieu dipaparin kabagjaan sareng kelancaran dina sagala urusan.'
            },
            gaul: {
                name: 'Jakarta / Gaul',
                voice: 'Puck',
                customInstruction: 'Ucapkan dengan gaya santai khas anak muda Jakarta / Betawi, sangat ekspresif, gaul dan natural:',
                sample: 'Halo bro sist! Jujur ya, AI Voice Studio ini keren banget sih. Suaranya beneran smooth dan asik banget listened to. Coba langsung tes deh!'
            },
            formal: {
                name: 'Pembaca Berita',
                voice: 'Charon',
                customInstruction: 'Say in a clear, authoritative, highly professional TV news anchor voice in Indonesian with flawless articulation:',
                sample: 'Selamat malam pemirsa, kembali bersama Berita Nusantara Utama. Hari ini perkembangan teknologi kecerdasan buatan di Indonesia mengalami kemajuan yang sangat pesat.'
            },
            dongeng: {
                name: 'Pendongeng',
                voice: 'Sulafat',
                customInstruction: 'Ucapkan dengan suara mendongeng yang penuh ekspresi, hangat, imajinatif, penuh keajaiban dan lembut:',
                sample: 'Pada zaman dahulu kala, di sebuah desa lereng gunung yang hijau dan damai, hiduplah seorang pemuda pemimpi yang memiliki hati sangat mulia...'
            },
            anime: {
                name: 'Energetik / Cute',
                voice: 'Leda',
                customInstruction: 'Say in an energetic, happy, upbeat, slightly enthusiastic pitch voice in Indonesian:',
                sample: 'Halo teman-teman semuanya! Wah, hari ini cerah banget ya! Ayo kita mulai petualangan seru kita dengan penuh semangat!'
            }
        };

        // Initialize App
        window.addEventListener('DOMContentLoaded', () => {
            selectPreset('jawa');
            setupCharCounter();
        });

        // Tab Switching Logic
        function switchTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.add('hidden');
                el.classList.remove('grid', 'flex');
            });

            const activeTab = document.getElementById(`tab-${tabName}`);
            if (tabName === 'tts' || tabName === 'agent' || tabName === 'multispeaker') {
                activeTab.classList.remove('hidden');
                activeTab.classList.add('grid');
            } else {
                activeTab.classList.remove('hidden');
                activeTab.classList.add('flex');
            }

            // Update Header Nav Buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('bg-brand-600', 'text-white');
                btn.classList.add('text-gray-400');
            });

            const btn = document.getElementById(`tab-${tabName}-btn`);
            if (btn) {
                btn.classList.add('bg-brand-600', 'text-white');
                btn.classList.remove('text-gray-400');
            }
        }

        // Preset Selection Handler
        function selectPreset(key) {
            currentPreset = key;
            const preset = PRESETS[key];
            
            // Highlight Grid Card
            document.querySelectorAll('.preset-card').forEach(card => {
                card.classList.remove('border-brand-500', 'bg-brand-500/10');
                card.classList.add('border-gray-800', 'bg-gray-900/50');
            });

            const activeCard = document.getElementById(`preset-${key}`);
            if (activeCard) {
                activeCard.classList.add('border-brand-500', 'bg-brand-500/10');
                activeCard.classList.remove('border-gray-800', 'bg-gray-900/50');
            }

            // Set Inputs
            document.getElementById('voice-name').value = preset.voice;
            document.getElementById('custom-prompt').value = preset.customInstruction;
        }

        function loadSampleText(type) {
            const input = document.getElementById('tts-input-text');
            if (type === 'jawa') input.value = PRESETS.jawa.sample;
            if (type === 'sunda') input.value = PRESETS.sunda.sample;
            if (type === 'berita') input.value = PRESETS.formal.sample;
            updateCharCount();
        }

        function setupCharCounter() {
            const input = document.getElementById('tts-input-text');
            input.addEventListener('input', updateCharCount);
        }

        function updateCharCount() {
            const count = document.getElementById('tts-input-text').value.length;
            document.getElementById('char-count').innerText = `${count} Karakter`;
        }

        // API Call with Exponential Backoff Helper
        async function fetchWithRetry(url, options, maxRetries = 3) {
            let delay = 1000;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    const response = await fetch(url, options);
                    if (response.ok) return response;
                    if (response.status === 429) {
                        await new Promise(res => setTimeout(res, delay));
                        delay *= 2;
                        continue;
                    }
                    const errText = await response.text();
                    throw new Error(`API Error Status ${response.status}: ${errText}`);
                } catch (err) {
                    if (i === maxRetries - 1) throw err;
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2;
                }
            }
        }

        // Generate Single Speaker Audio via Gemini 2.5 TTS
        async function generateSpeech(customTextOverride = null, customVoiceOverride = null) {
            const textInput = customTextOverride || document.getElementById('tts-input-text').value.trim();
            if (!textInput) {
                alert('Silakan masukkan teks terlebih dahulu!');
                return;
            }

            const voiceName = customVoiceOverride || document.getElementById('voice-name').value;
            const customInstruction = document.getElementById('custom-prompt').value.trim();
            const speedMod = document.getElementById('speed-modifier').value;
            const emotionMod = document.getElementById('emotion-modifier').value;

            const fullPromptText = `${customInstruction} (Gunakan tempo ${speedMod}, dan ekspresi ${emotionMod}): ${textInput}`;

            const btn = document.getElementById('generate-speech-btn');
            const originalBtnHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Menghasilkan Suara...`;

            try {
                const apiKey = ""; // API Key handled dynamically by platform
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

                const payload = {
                    contents: [{
                        parts: [{ text: fullPromptText }]
                    }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: voiceName }
                            }
                        }
                    }
                };

                const response = await fetchWithRetry(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                const part = result?.candidates?.[0]?.content?.parts?.[0];
                const audioData = part?.inlineData?.data;
                const mimeType = part?.inlineData?.mimeType || "audio/L16;rate=24000";

                if (!audioData) {
                    throw new Error('Tidak ada data audio yang diterima dari model.');
                }

                // Process Audio Data (Convert PCM 16bit to WAV)
                const sampleRateMatch = mimeType.match(/rate=(\d+)/);
                const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
                
                const pcmBuffer = base64ToArrayBuffer(audioData);
                const pcm16 = new Int16Array(pcmBuffer);
                const wavBlob = pcmToWav(pcm16, sampleRate);
                const audioUrl = URL.createObjectURL(wavBlob);

                // Update Audio Output UI
                const outputCard = document.getElementById('audio-output-card');
                outputCard.classList.remove('hidden');
                outputCard.classList.add('flex');

                const audioPlayer = document.getElementById('main-audio-player');
                audioPlayer.src = audioUrl;
                audioPlayer.play();

                const downloadLink = document.getElementById('download-audio-link');
                downloadLink.href = audioUrl;

                // Draw Waveform Visualizer
                drawWaveform(pcm16);

                // Add to Audio History
                saveToHistory(textInput, PRESETS[currentPreset]?.name || 'Custom', voiceName, audioUrl, wavBlob);

            } catch (err) {
                console.error('Error generating TTS:', err);
                alert('Gagal menghasilkan suara. Error: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalBtnHtml;
            }
        }

        async function generateMultiSpeakerAudio() {
            const inputVal = document.getElementById('dialogue-text-input').value.trim();
            if (!inputVal) {
                alert('Silakan isi naskah percakapan!');
                return;
            }

            const spk1Voice = document.getElementById('spk1-voice').value;
            const spk1Accent = document.getElementById('spk1-accent').value;
            const spk2Voice = document.getElementById('spk2-voice').value;
            const spk2Accent = document.getElementById('spk2-accent').value;

            const fullPrompt = `Lakukan percakapan berikut secara alami:\nSpeaker1 harus berbicara dengan ${spk1Accent}.\nSpeaker2 harus berbicara dengan ${spk2Accent}.\n\nNaskah:\n${inputVal}`;

            const btn = document.getElementById('generate-dialogue-btn');
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Diproses...`;

            try {
                const apiKey = "";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

                const payload = {
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            multiSpeakerVoiceConfig: {
                                speakerVoiceConfigs: [
                                    { speaker: "Speaker1", voiceConfig: { prebuiltVoiceConfig: { voiceName: spk1Voice } } },
                                    { speaker: "Speaker2", voiceConfig: { prebuiltVoiceConfig: { voiceName: spk2Voice } } }
                                ]
                            }
                        }
                    }
                };

                const response = await fetchWithRetry(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                const part = result?.candidates?.[0]?.content?.parts?.[0];
                const audioData = part?.inlineData?.data;
                const mimeType = part?.inlineData?.mimeType || "audio/L16;rate=24000";

                if (!audioData) throw new Error('Data audio dialog tidak ditemukan.');

                const sampleRateMatch = mimeType.match(/rate=(\d+)/);
                const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
                
                const pcmBuffer = base64ToArrayBuffer(audioData);
                const pcm16 = new Int16Array(pcmBuffer);
                const wavBlob = pcmToWav(pcm16, sampleRate);
                const audioUrl = URL.createObjectURL(wavBlob);

                const card = document.getElementById('multi-audio-card');
                card.classList.remove('hidden');
                card.classList.add('flex');

                const player = document.getElementById('multi-audio-player');
                player.src = audioUrl;
                player.play();

                document.getElementById('download-multi-link').href = audioUrl;

                saveToHistory("Percakapan Multi-Speaker", "Podcast Drama", `${spk1Voice} & ${spk2Voice}`, audioUrl, wavBlob);

            } catch (err) {
                console.error(err);
                alert('Gagal membuat dialog: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-play"></i> Hasilkan Audio Percakapan (Podcast)`;
            }
        }

        function loadSampleConversation() {
            document.getElementById('dialogue-text-input').value = 
`Speaker1: Sugeng enjang mas! Pripun kabar proyek aplikasi Nusantara Voice AI kita?
Speaker2: Wah gokil banget bro, ini jalannya makin smooth dan suara logat Jawatnya medok banget!
Speaker1: Mantap tenan! Kabeh fitur Text-to-Speech lan AI Agent wis siap dienggo.`;
        }

        async function sendAgentMessage(e) {
            e.preventDefault();
            const inputEl = document.getElementById('agent-input-text');
            const message = inputEl.value.trim();
            if (!message) return;

            const persona = document.getElementById('agent-persona').value;
            inputEl.value = '';

            // Append User Bubble
            appendChatMessage('user', message);

            const sendBtn = document.getElementById('send-agent-btn');
            sendBtn.disabled = true;

            try {
                // System Instruction according to Persona
                let systemInstructionText = "Anda adalah AI Agent Nusantara Voice yang ahli dalam bahasa Indonesia dan bahasa daerah (Jawa Medok, Sunda, Gaul Jakarta). Responlah dengan singkat, ramah, dan natural.";
                let voiceForAgent = "Kore";

                if (persona === 'jawa_medok') {
                    systemInstructionText = "Anda adalah Mas Budi, asisten AI orang Jawa Medok yang ramah, sopan, sering memakai sisipan bahasa Jawa yang hangat (nggih, sampeyan, piye, matur nuwun).";
                    voiceForAgent = "Puck";
                } else if (persona === 'sunda_halus') {
                    systemInstructionText = "Anda adalah Ceu Edah, asisten Sunda yang merdu, ramah, dan supel (sampurasun, wilujeng).";
                    voiceForAgent = "Aoede";
                }

                const apiKey = "";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

                const payload = {
                    contents: [{ parts: [{ text: message }] }],
                    systemInstruction: { parts: [{ text: systemInstructionText }] }
                };

                const response = await fetchWithRetry(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                const botReply = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak bisa memproses permintaan saat ini.";

                // Append AI Agent Bubble
                appendChatMessage('agent', botReply, voiceForAgent);

            } catch (err) {
                console.error(err);
                appendChatMessage('agent', 'Maaf terjadi kendala koneksi dengan AI Agent.');
            } finally {
                sendBtn.disabled = false;
            }
        }

        function appendChatMessage(sender, text, defaultVoice = 'Kore') {
            const container = document.getElementById('chat-messages');
            const wrapper = document.createElement('div');
            wrapper.className = `flex gap-3 max-w-[85%] ${sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`;

            const iconClass = sender === 'user' ? 'fa-user bg-brand-600' : 'fa-robot bg-accent-600';
            const bgClass = sender === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 border border-gray-700/50 rounded-tl-none';

            let actionButtons = '';
            if (sender === 'agent') {
                actionButtons = `
                    <div class="mt-2.5 pt-2 border-t border-gray-700/50 flex items-center gap-2">
                        <button onclick="speakAgentResponse('${encodeURIComponent(text)}', '${defaultVoice}')" class="px-2.5 py-1 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 text-[10px] font-semibold rounded-md transition flex items-center gap-1">
                            <i class="fa-solid fa-volume-high"></i> Dengarkan Suara (Speak)
                        </button>
                    </div>
                `;
            }

            wrapper.innerHTML = `
                <div class="w-8 h-8 rounded-full ${iconClass} flex items-center justify-center text-white text-xs shrink-0">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div class="${bgClass} p-3.5 rounded-2xl text-xs leading-relaxed">
                    <p>${text.replace(/\n/g, '<br>')}</p>
                    ${actionButtons}
                </div>
            `;

            container.appendChild(wrapper);
            container.scrollTop = container.scrollHeight;
        }

        function speakAgentResponse(encodedText, voice) {
            const text = decodeURIComponent(encodedText);
            switchTab('tts');
            document.getElementById('tts-input-text').value = text;
            updateCharCount();
            generateSpeech(text, voice);
        }

        function clearChat() {
            document.getElementById('chat-messages').innerHTML = '';
        }

        // Audio Binary & WAV Utilities
        function base64ToArrayBuffer(base64) {
            const binaryString = window.atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }

        function pcmToWav(pcm16Data, sampleRate = 24000) {
            const numChannels = 1;
            const bytesPerSample = 2;
            const blockAlign = numChannels * bytesPerSample;
            const byteRate = sampleRate * blockAlign;
            const dataSize = pcm16Data.length * bytesPerSample;
            const buffer = new ArrayBuffer(44 + dataSize);
            const view = new DataView(buffer);

            // RIFF chunk descriptor
            writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + dataSize, true);
            writeString(view, 8, 'WAVE');

            // fmt sub-chunk
            writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true); // Subchunk1Size
            view.setUint16(20, 1, true);  // AudioFormat (PCM)
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, 16, true); // BitsPerSample

            // data sub-chunk
            writeString(view, 36, 'data');
            view.setUint32(40, dataSize, true);

            // Write PCM samples
            let offset = 44;
            for (let i = 0; i < pcm16Data.length; i++) {
                view.setInt16(offset, pcm16Data[i], true);
                offset += 2;
            }

            return new Blob([buffer], { type: 'audio/wav' });
        }

        function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }

        // Waveform Visualizer
        function drawWaveform(pcm16Array) {
            const canvas = document.getElementById('waveform-canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#14b8a6';
            ctx.beginPath();

            const sliceWidth = canvas.width / pcm16Array.length * 100; // Subsampling step
            let x = 0;

            for (let i = 0; i < pcm16Array.length; i += 100) {
                const v = pcm16Array[i] / 32768.0;
                const y = (v * canvas.height / 2) + (canvas.height / 2);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                x += sliceWidth;
            }

            ctx.stroke();
        }

        function saveToHistory(text, presetName, voice, audioUrl, blob) {
            const item = {
                id: Date.now(),
                text: text.length > 80 ? text.substring(0, 80) + '...' : text,
                preset: presetName,
                voice: voice,
                url: audioUrl,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            audioHistory.unshift(item);
            renderHistory();
        }

        function renderHistory() {
            const container = document.getElementById('history-list');
            const emptyMsg = document.getElementById('empty-history-msg');

            if (audioHistory.length === 0) {
                if (emptyMsg) emptyMsg.classList.remove('hidden');
                return;
            }

            if (emptyMsg) emptyMsg.classList.add('hidden');
            container.innerHTML = '';

            audioHistory.forEach(item => {
                const card = document.createElement('div');
                card.className = 'glass-card p-3 rounded-xl flex items-center justify-between gap-4 border border-gray-800 hover:border-gray-700 transition';
                card.innerHTML = `
                    <div class="flex items-center gap-3 overflow-hidden">
                        <div class="w-9 h-9 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 text-sm">
                            <i class="fa-solid fa-music"></i>
                        </div>
                        <div class="truncate">
                            <div class="text-xs font-semibold text-white truncate">${item.text}</div>
                            <div class="text-[10px] text-gray-400 flex items-center gap-2">
                                <span>${item.preset} (${item.voice})</span> &bull; 
                                <span>${item.time}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <audio src="${item.url}" controls class="h-8 w-40 accent-brand-500"></audio>
                        <a href="${item.url}" download="nusantara-voice-${item.id}.wav" class="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition">
                            <i class="fa-solid fa-download"></i>
                        </a>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        function clearHistory() {
            audioHistory = [];
            renderHistory();
        }
    </script>
</body>
</html>