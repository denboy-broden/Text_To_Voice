import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "server/*/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "sources/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@nusantara/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@nusantara/providers": path.resolve(__dirname, "packages/providers/src/index.ts"),
      "@nusantara/tts-engine": path.resolve(__dirname, "packages/tts-engine/src/index.ts"),
      "@nusantara/audio-engine": path.resolve(__dirname, "packages/audio-engine/src/index.ts"),
      "@nusantara/server": path.resolve(__dirname, "server/api/src/index.ts"),
    },
  },
})
