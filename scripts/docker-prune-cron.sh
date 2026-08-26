#!/bin/bash
# 管理 rewindom Docker 清理定时任务（宿主机级，production/test 同机共用一份）
# 用法:
#   ./scripts/docker-prune-cron.sh install
#   ./scripts/docker-prune-cron.sh disable
#   ./scripts/docker-prune-cron.sh status
# 从开发机装到远程:
#   ./scripts/docker-prune-cron.sh install --remote --env production

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"

CRON_TAG="# rewindom-docker-prune"
APP_OPS_DIR="/etc/rewindom/scripts"
PRUNE_SCRIPT="${APP_OPS_DIR}/docker-prune.sh"
LOCK_FILE="/tmp/rewindom-docker-prune.lock"
LOG_FILE="/var/log/rewindom-docker-prune.log"
ACTION=""
REMOTE=0
ENVIRONMENT="production"

usage() {
  sed -n '2,8p' "$0"
  exit 1
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      install|disable|status)
        ACTION="$1"
        shift
        ;;
      --remote)
        REMOTE=1
        shift
        ;;
      --env)
        ENVIRONMENT="$2"
        shift 2
        ;;
      --help|-h)
        usage
        ;;
      *)
        log_error "未知参数: $1"
        usage
        ;;
    esac
  done

  if [ -z "$ACTION" ]; then
    log_error "请指定操作: install | disable | status"
    usage
  fi

  if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "test" ]; then
    log_die "无效的环境参数: ${ENVIRONMENT}（仅支持 production 或 test）"
  fi
}

check_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    log_die "请使用 root 用户运行此脚本"
  fi
}

sync_prune_script() {
  local source source_lib_dir
  source="${SCRIPT_DIR}/docker-prune.sh"
  source_lib_dir="${SCRIPT_DIR}/lib"

  if [ ! -f "$source" ]; then
    if [ -f "$PRUNE_SCRIPT" ]; then
      log_warn "未找到 ${source}，保留现有 ${PRUNE_SCRIPT}"
      return 0
    fi
    log_die "清理脚本不存在: $source"
  fi

  mkdir -p "${APP_OPS_DIR}/lib"
  if [ "$source" -ef "$PRUNE_SCRIPT" ]; then
    log_info "清理脚本已在 ${PRUNE_SCRIPT}"
  else
    install -m 755 "$source" "$PRUNE_SCRIPT"
    log_info "已同步清理脚本 -> ${PRUNE_SCRIPT}"
  fi
  if [ -f "${source_lib_dir}/log.sh" ] && ! [ "${source_lib_dir}/log.sh" -ef "${APP_OPS_DIR}/lib/log.sh" ]; then
    install -m 644 "${source_lib_dir}/log.sh" "${APP_OPS_DIR}/lib/log.sh"
  fi
}

ensure_cron_service() {
  if systemctl is-active --quiet cron 2>/dev/null || systemctl is-active --quiet crond 2>/dev/null; then
    return 0
  fi

  log_warn "cron 服务未运行，尝试启动..."
  systemctl start cron 2>/dev/null || systemctl start crond 2>/dev/null || {
    log_die "无法启动 cron 服务，请手动检查: systemctl status cron"
  }
  systemctl enable cron 2>/dev/null || systemctl enable crond 2>/dev/null || true
}

remove_cron() {
  local current filtered
  current=$(crontab -l 2>/dev/null || true)
  if [ -z "$current" ]; then
    return 0
  fi

  filtered=$(printf '%s\n' "$current" | grep -vF "$CRON_TAG" || true)
  filtered=$(printf '%s\n' "$filtered" | grep -vF "$PRUNE_SCRIPT" || true)

  if [ -n "$filtered" ]; then
    printf '%s\n' "$filtered" | crontab -
  else
    crontab -r 2>/dev/null || true
  fi
}

install_cron() {
  sync_prune_script

  if [ ! -f "$PRUNE_SCRIPT" ]; then
    log_die "清理脚本不存在: $PRUNE_SCRIPT"
  fi

  ensure_cron_service
  touch "$LOG_FILE"

  remove_cron
  {
    crontab -l 2>/dev/null || true
    echo "15 4 * * * flock -n ${LOCK_FILE} bash ${PRUNE_SCRIPT} >> ${LOG_FILE} 2>&1 ${CRON_TAG}"
  } | crontab -

  log_info "已安装 Docker 清理定时任务（每天 04:15）"
  log_info "清理脚本: $PRUNE_SCRIPT"
  log_info "清理日志: $LOG_FILE"
  log_info "手动测试: bash $PRUNE_SCRIPT --dry-run"
}

disable_cron() {
  remove_cron
  log_info "已禁用 Docker 清理定时任务"
}

show_status() {
  local current matches
  current=$(crontab -l 2>/dev/null || true)

  if [ -z "$current" ]; then
    log_warn "当前用户没有 crontab 条目"
    exit 0
  fi

  matches=$(printf '%s\n' "$current" | grep -F "rewindom-docker-prune" || true)
  if [ -z "$matches" ]; then
    log_warn "未找到 rewindom Docker 清理定时任务"
    exit 0
  fi

  log_info "当前 rewindom Docker 清理定时任务:"
  printf '%s\n' "$matches"
}

run_remote() {
  # shellcheck source=lib/deploy-remote.sh
  source "${SCRIPT_DIR}/lib/deploy-remote.sh"
  load_deploy_credentials "$ENVIRONMENT"

  log_info "同步脚本到 ${DEPLOY_SSH_USER}@${DEPLOY_HOST}:${APP_OPS_DIR}"
  _run_ssh "mkdir -p '${APP_OPS_DIR}/lib'"
  _run_scp "${SCRIPT_DIR}/docker-prune.sh" "${DEPLOY_SSH_USER}@${DEPLOY_HOST}:${APP_OPS_DIR}/docker-prune.sh"
  _run_scp "${SCRIPT_DIR}/docker-prune-cron.sh" "${DEPLOY_SSH_USER}@${DEPLOY_HOST}:${APP_OPS_DIR}/docker-prune-cron.sh"
  _run_scp "${SCRIPT_DIR}/lib/log.sh" "${DEPLOY_SSH_USER}@${DEPLOY_HOST}:${APP_OPS_DIR}/lib/log.sh"
  _run_ssh "chmod +x '${APP_OPS_DIR}/docker-prune.sh' '${APP_OPS_DIR}/docker-prune-cron.sh'"
  _run_ssh "bash '${APP_OPS_DIR}/docker-prune-cron.sh' '${ACTION}'"
}

main() {
  parse_args "$@"

  if [ "$REMOTE" -eq 1 ]; then
    run_remote
    return 0
  fi

  if [ "$ACTION" != "status" ]; then
    check_root
  fi

  case "$ACTION" in
    install) install_cron ;;
    disable) disable_cron ;;
    status)  show_status ;;
  esac
}

main "$@"
