#!/bin/bash
# Docker 部署：首次 bootstrap 与日常更新共用（源码在服务器 docker compose build）
#
# 用法:
#   cp scripts/env.production.example .env.production
#   pnpm bootstrap -- --env production
#   pnpm deploy -- --env production
#   pnpm deploy -- --env production --env-only
#   pnpm bootstrap -- --env production --yes
#
# 前置: DNS A 记录指向服务器；80/443 由宿主机 Nginx 使用

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/deploy-env.sh
source "$ROOT/scripts/lib/deploy-env.sh"
# shellcheck source=scripts/lib/docker-deploy-remote.sh
source "$ROOT/scripts/lib/docker-deploy-remote.sh"

ENVIRONMENT="production"
YES=0
BOOTSTRAP=0
ENV_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --bootstrap)
      BOOTSTRAP=1
      shift
      ;;
    --env-only)
      ENV_ONLY=1
      shift
      ;;
    --yes|-y)
      YES=1
      shift
      ;;
    --)
      shift
      ;;
    --help|-h)
      sed -n '3,12p' "$0"
      exit 0
      ;;
    *)
      log_die "未知选项: $1（可用 --env、--bootstrap、--env-only、--yes）"
      ;;
  esac
done

load_deploy_env "$ROOT" "$ENVIRONMENT"
docker_deploy "$ENVIRONMENT" "$YES" "$BOOTSTRAP" "$ENV_ONLY"
