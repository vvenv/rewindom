#!/bin/bash
# 查看远程 Docker 栈日志（production / test）
#
# 用法:
#   ./scripts/logs.sh
#   ./scripts/logs.sh --env test
#   ./scripts/logs.sh --env production --tail 300
#   ./scripts/logs.sh --follow
#   ./scripts/logs.sh --service app
#   ./scripts/logs.sh --grep 'import|OOM|heap|502|FATAL'
#   pnpm logs -- --env production --follow --service app

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/log.sh
source "$ROOT/scripts/lib/log.sh"
# shellcheck source=scripts/lib/docker-deploy-remote.sh
source "$ROOT/scripts/lib/docker-deploy-remote.sh"

DEPLOY_ENV="production"
ENV_PRESET=0
INTERACTIVE=0
TAIL_LINES=200
FOLLOW=0
GREP_PATTERN=""
SERVICES=()
LOG_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      DEPLOY_ENV="$2"
      ENV_PRESET=1
      shift 2
      ;;
    --tail)
      TAIL_LINES="$2"
      shift 2
      ;;
    --follow|-f)
      FOLLOW=1
      shift
      ;;
    --service|-s)
      SERVICES+=("$2")
      shift 2
      ;;
    --grep|-g)
      GREP_PATTERN="$2"
      shift 2
      ;;
    --help|-h)
      sed -n '3,12p' "$0"
      exit 0
      ;;
    --)
      shift
      ;;
    -*)
      log_die "未知选项: $1（可用 --env、--tail、--follow、--service、--grep）"
      ;;
    *)
      SERVICES+=("$1")
      shift
      ;;
  esac
done

if [ -t 0 ] && [ "$ENV_PRESET" -eq 0 ]; then
  INTERACTIVE=1
fi

if [ "$INTERACTIVE" -eq 1 ]; then
  # shellcheck source=scripts/lib/prompt-menu.sh
  source "$ROOT/scripts/lib/prompt-menu.sh"
  DEPLOY_ENV="$(prompt_menu "日志环境" --default=1 \
    "production:生产环境" \
    "test:测试环境")"
fi

LOG_ARGS=(--tail "$TAIL_LINES")
if [ "$FOLLOW" -eq 1 ]; then
  LOG_ARGS+=(--follow)
fi
if [ -n "$GREP_PATTERN" ]; then
  LOG_ARGS+=(--grep "$GREP_PATTERN")
fi
if [ "${#SERVICES[@]}" -gt 0 ]; then
  for svc in "${SERVICES[@]}"; do
    LOG_ARGS+=(--service "$svc")
  done
fi

docker_remote_logs "$DEPLOY_ENV" "${LOG_ARGS[@]}"
