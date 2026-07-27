#!/bin/bash
# 本地开发环境初始化（幂等，可重复执行）
#
# 用法: pnpm setup
# 完成后: pnpm dev

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/log.sh
source "$ROOT/scripts/lib/log.sh"

if ! command -v docker >/dev/null 2>&1; then
  log_die "未安装 Docker。请安装 Docker Desktop 或 docker.io 后重试"
fi

if ! docker info >/dev/null 2>&1; then
  log_die "Docker 未运行。请先启动 Docker"
fi

if [ ! -f "$ROOT/.env.local" ]; then
  if [ -f "$ROOT/.env.example" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env.local"
    log_warn "已创建 .env.local（从 .env.example 复制），请按需修改密钥与 API Key"
  else
    log_die "缺少 .env.example，无法生成 .env.local"
  fi
else
  log_info ".env.local 已存在"
fi

log_info "启动本地 Postgres + Redis（docker-compose.dev.yml）..."
docker compose -f docker-compose.dev.yml up -d --wait

log_info "执行数据库迁移..."
pnpm --filter server exec prisma migrate deploy

log_success "本地开发环境就绪"
log_info "下一步: pnpm dev"
log_info "  前端 http://localhost:5175"
log_info "  API   http://localhost:3400（Vite 代理 /api）"
