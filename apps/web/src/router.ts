import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "tts-studio",
    component: () => import("./views/TTSStudio.vue"),
    meta: { title: "TTS Studio", icon: "🎙️" },
  },
  {
    path: "/agent",
    name: "voice-agent",
    component: () => import("./views/VoiceAIAgent.vue"),
    meta: { title: "Voice AI Agent", icon: "🤖" },
  },
  {
    path: "/drama",
    name: "drama",
    component: () => import("./views/DramaPodcast.vue"),
    meta: { title: "Drama / Podcast", icon: "🎭" },
  },
  {
    path: "/library",
    name: "library",
    component: () => import("./views/AudioLibrary.vue"),
    meta: { title: "Audio Library", icon: "📁" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach((to) => {
  const title = (to.meta.title as string) || "Nusantara Voice AI";
  document.title = `${title} — Nusantara Voice AI`;
});

export default router;
