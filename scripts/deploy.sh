#!/bin/bash
# Docker 部署当前仓库代码到远程服务器
#
# 用法:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --env test
#   ./scripts/deploy.sh --env production --env-only
#   ./scripts/deploy.sh --env production --bootstrap   # 首次部署（含 Nginx + SSL）
#
# 与 release.sh 区别：本脚本只部署，不修改版本号、不提交、不打 tag。

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/log.sh
source "$ROOT/scripts/lib/log.sh"

DEPLOY_ENV="production"
ENV_ONLY=0
BOOTSTRAP=0
ENV_PRESET=0
INTERACTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      DEPLOY_ENV="$2"
      ENV_PRESET=1
      shift 2
      ;;
    --env-only)
      ENV_ONLY=1
      shift
      ;;
    --bootstrap)
      BOOTSTRAP=1
      shift
      ;;
    --help|-h)
      sed -n '3,10p' "$0"
      exit 0
      ;;
    -*)
      log_die "未知选项: $1（可用 --env、--env-only、--bootstrap）"
      ;;
    *)
      log_die "多余的参数: $1"
      ;;
  esac
done

if [ -t 0 ] && [ "$ENV_PRESET" -eq 0 ]; then
  INTERACTIVE=1
fi

if [ "$INTERACTIVE" -eq 1 ]; then
  # shellcheck source=scripts/lib/prompt-menu.sh
  source "$ROOT/scripts/lib/prompt-menu.sh"
  DEPLOY_ENV="$(prompt_menu "部署环境" --default=1 \
    "production:生产环境" \
    "test:测试环境")"
fi

log_info "部署目标: ${DEPLOY_ENV}"

args=(--env "$DEPLOY_ENV")
if [ "$ENV_ONLY" -eq 1 ]; then
  args+=(--env-only)
fi
if [ "$BOOTSTRAP" -eq 1 ]; then
  args+=(--bootstrap)
fi

exec bash "$ROOT/scripts/docker-deploy-remote.sh" "${args[@]}"
