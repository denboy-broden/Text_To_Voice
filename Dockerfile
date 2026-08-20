FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml turbo.json ./
COPY packages/core/package.json packages/core/
COPY packages/providers/package.json packages/providers/
COPY packages/tts-engine/package.json packages/tts-engine/
COPY packages/audio-engine/package.json packages/audio-engine/
COPY server/api/package.json server/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/providers/node_modules ./packages/providers/node_modules
COPY --from=deps /app/packages/tts-engine/node_modules ./packages/tts-engine/node_modules
COPY --from=deps /app/packages/audio-engine/node_modules ./packages/audio-engine/node_modules
COPY --from=deps /app/server/api/node_modules ./server/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm turbo build --filter=@nusantara/server...

FROM node:20-alpine AS production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/server/api/dist ./server/api/dist
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/providers/dist ./packages/providers/dist
COPY --from=build /app/packages/tts-engine/dist ./packages/tts-engine/dist
COPY --from=build /app/packages/audio-engine/dist ./packages/audio-engine/dist
COPY --from=build /app/server/api/package.json ./server/api/package.json
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/packages/providers/package.json ./packages/providers/package.json
COPY --from=build /app/packages/tts-engine/package.json ./packages/tts-engine/package.json
COPY --from=build /app/packages/audio-engine/package.json ./packages/audio-engine/package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml

WORKDIR /app/server/api
EXPOSE 3001
CMD ["node", "dist/index.js"]
