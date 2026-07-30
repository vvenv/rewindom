# syntax=docker/dockerfile:1.7
# be-water 生产镜像：builder → app（Node API）→ web（Nginx + 静态资源）
# 与 sibling shipest 同构：依赖清单分层 + BuildKit pnpm store 缓存 + prod prune
ARG NODE_VERSION=22
ARG PNPM_VERSION=11.17.0

FROM node:${NODE_VERSION}-bookworm-slim AS builder

ARG PNPM_VERSION
ENV DEBIAN_FRONTEND=noninteractive
ENV CI=true
ENV PNPM_STORE_DIR=/pnpm/store

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends git ca-certificates procps openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

# prisma.config.ts 在 generate 阶段需要 DATABASE_URL（仅构建占位，非运行时连接）
ENV DATABASE_URL=postgresql://be-water:build@localhost:5432/be-water

# 仅依赖清单：业务代码变更不失效 install 层
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/client-kit/package.json packages/client-kit/
COPY packages/client-test/package.json packages/client-test/
COPY packages/modules/package.json packages/modules/
COPY packages/server-kernel/package.json packages/server-kernel/
COPY packages/server-test/package.json packages/server-test/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

RUN --mount=type=cache,id=be-water-pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

COPY apps apps
COPY packages packages

# 官网 canonical / og:url / sitemap 的域名在**构建期**写死进静态 HTML，
# 因此必须是 build arg 而不是运行时环境变量（部署脚本传 https://${APP_DOMAIN}）。
ARG SITE_URL
ENV SITE_URL=${SITE_URL}

RUN pnpm --filter server exec prisma generate \
  && pnpm build

# 去掉开发依赖，保留 workspace 链接（prune --prod 会拆掉 @be-water/* 软链）
RUN --mount=type=cache,id=be-water-pnpm-store,target=/pnpm/store \
  rm -rf node_modules apps/*/node_modules packages/*/node_modules \
  && pnpm install --frozen-lockfile --prod

FROM node:${NODE_VERSION}-bookworm-slim AS app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3700

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/apps/client/dist ./apps/client/dist
COPY --from=builder /app/packages ./packages

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3700

ENTRYPOINT ["/entrypoint.sh"]

FROM nginx:1.27-alpine AS web

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

EXPOSE 80
