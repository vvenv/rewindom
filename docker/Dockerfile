# syntax=docker/dockerfile:1.7
# rewindom 生产镜像：builder → app（Node API）→ web（Nginx + 静态资源）
# 与 sibling shipest 同构：依赖清单分层 + BuildKit pnpm store 缓存 + prod prune
ARG NODE_VERSION=22
ARG PNPM_VERSION=11.22.0

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
ENV DATABASE_URL=postgresql://rewindom:build@localhost:5432/rewindom

# 仅依赖清单：业务代码变更不失效 install 层
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/builtin/package.json packages/builtin/
COPY packages/client-kit/package.json packages/client-kit/
COPY packages/client-test/package.json packages/client-test/
COPY packages/module-sdk/package.json packages/module-sdk/
COPY packages/server-kernel/package.json packages/server-kernel/
COPY packages/server-test/package.json packages/server-test/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY modules/bookmark/package.json modules/bookmark/
COPY modules/events/package.json modules/events/
COPY modules/note/package.json modules/note/
COPY modules/shop/package.json modules/shop/
COPY modules/site-docs/package.json modules/site-docs/
COPY modules/site-form/package.json modules/site-form/
COPY modules/todo/package.json modules/todo/

RUN --mount=type=cache,id=rewindom-pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

COPY apps apps
COPY packages packages
COPY modules modules

RUN pnpm --filter server exec prisma generate \
  && pnpm build

# 去掉开发依赖，保留 workspace 链接（prune --prod 会拆掉 @rewindom/* 软链）
RUN --mount=type=cache,id=rewindom-pnpm-store,target=/pnpm/store \
  rm -rf node_modules apps/*/node_modules packages/*/node_modules modules/*/node_modules \
  && pnpm install --frozen-lockfile --prod

# migrate deploy 要读 schema；models 是指向 packages/modules 的软链。
# 解成普通文件后，运行镜像不必再带整棵 workspace 源码。
RUN mkdir -p /runtime/prisma/models \
  && cp apps/server/prisma/schema.prisma /runtime/prisma/ \
  && cp -a apps/server/prisma/migrations /runtime/prisma/ \
  && for f in apps/server/prisma/models/*.prisma; do \
       cp -L "$f" /runtime/prisma/models/; \
     done

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
COPY --from=builder /app/apps/server/package.json /app/apps/server/prisma.config.ts ./apps/server/
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist/index.js ./apps/server/dist/index.js
COPY --from=builder /runtime/prisma ./apps/server/prisma
# OG 卡片读 apps/client/dist/assets/site-fonts；web 镜像另拷一份给 Nginx
COPY --from=builder /app/apps/client/dist ./apps/client/dist

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3700

ENTRYPOINT ["/entrypoint.sh"]

FROM nginx:1.27-alpine AS web

# 官方镜像会对 /etc/nginx/templates/*.template 做 envsubst → conf.d/
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

EXPOSE 80
