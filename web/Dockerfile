# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY web/package.json ./web/
RUN pnpm install --filter @trailfed/web --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app /app
COPY web ./web
COPY tsconfig.base.json ./
RUN pnpm --filter @trailfed/web run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app/web
RUN corepack enable
ENV NODE_ENV=production
COPY --from=build /app/web/build ./build
COPY --from=build /app/web/package.json ./package.json
COPY --from=build /app/web/node_modules ./node_modules
USER node
EXPOSE 5173
ENV PORT=5173
ENV HOST=0.0.0.0
CMD ["node", "build/index.js"]
