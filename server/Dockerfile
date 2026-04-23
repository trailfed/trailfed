# syntax=docker/dockerfile:1.7
FROM node:25-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY server/package.json ./server/
RUN pnpm install --filter @trailfed/server --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app /app
COPY server ./server
COPY tsconfig.base.json ./
RUN pnpm --filter @trailfed/server run build

FROM node:25-bookworm-slim AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=build /app/server/package.json /app/server/package.json
COPY --from=build /app/server/dist /app/server/dist
COPY --from=build /app/server/node_modules /app/server/node_modules
COPY --from=build /app/node_modules /app/node_modules
WORKDIR /app/server
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
