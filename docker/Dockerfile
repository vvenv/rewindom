# be-water 生产镜像：builder → app（Node API）→ web（Nginx + 静态资源）
ARG NODE_VERSION=22
ARG PNPM_VERSION=11.17.0

FROM node:${NODE_VERSION}-bookworm-slim AS builder

ARG PNPM_VERSION
ENV DEBIAN_FRONTEND=noninteractive
ENV CI=true

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends git ca-certificates procps openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

# prisma.config.ts 在 generate 阶段需要 DATABASE_URL（仅构建占位，非运行时连接）
ENV DATABASE_URL=postgresql://be-water:build@localhost:5432/be-water

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps apps
COPY packages packages

RUN pnpm install --frozen-lockfile \
  && pnpm --filter server exec prisma generate \
  && pnpm build

FROM node:${NODE_VERSION}-bookworm-slim AS app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3400

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/apps/client/dist ./apps/client/dist
COPY --from=builder /app/packages ./packages

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3400

ENTRYPOINT ["/entrypoint.sh"]

FROM nginx:1.27-alpine AS web

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

EXPOSE 80
