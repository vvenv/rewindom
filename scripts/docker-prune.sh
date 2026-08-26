#!/bin/bash
# 清理 Docker 悬空产物（在服务器上以 root 运行；由 docker-prune-cron.sh 定时或手动调用）
#
# 只删「没人用」的东西，避免下次 compose build 变冷、也避免误删 PG/Redis 数据：
#   ✓ 悬空镜像（被 latest 顶掉的旧层）
#   ✓ 已退出容器
#   ✓ 未使用网络
#   ✓ 3 天前的未用 BuildKit 缓存（小盘上失败构建很容易堆到十几 GB）
#   ✓ 过大的容器 json-file 日志
#   ✗ 不用 image prune -a / --volumes（不删仍在跑的镜像、不删 PG/Redis 数据卷）
# 磁盘 ≥90% 时额外清 24h 前的未用 build cache，以免再次写满。
#
# 用法:
#   ./scripts/docker-prune.sh
#   ./scripts/docker-prune.sh --dry-run
#   ./scripts/docker-prune.sh --skip-builder   # 部署前轻量清，留给即将开始的 build 用缓存
#   ./scripts/docker-prune.sh --help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"

DRY_RUN=0
SKIP_BUILDER=0
DISK_AGGRESSIVE_PCT=80
BUILDER_KEEP_HOURS=72
CONTAINER_LOG_MAX=100M

usage() {
  sed -n '2,17p' "$0"
  exit 0
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      --skip-builder)
        SKIP_BUILDER=1
        shift
        ;;
      --help|-h)
        usage
        ;;
      *)
        log_die "未知参数: $1"
        ;;
    esac
  done
}

check_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    log_die "请使用 root 用户运行此脚本"
  fi
}

root_disk_pct() {
  df -P / | awk 'NR==2 { gsub(/%/, "", $5); print $5 }'
}

bytes_human() {
  local n="${1:-0}"
  awk -v n="$n" 'BEGIN {
    split("B KB MB GB TB", u)
    i = 1
    while (n >= 1024 && i < 5) { n /= 1024; i++ }
    printf "%.1f%s", n, u[i]
  }'
}

is_compose_build_running() {
  pgrep -f '[d]ocker compose .*build' >/dev/null 2>&1 \
    || pgrep -f '[d]ocker-compose .*build' >/dev/null 2>&1 \
    || pgrep -f '[r]ewindom-docker-compose-job' >/dev/null 2>&1
}

print_df() {
  df -hT / | awk 'NR==1 || /\/$/'
}

report_reclaimable() {
  log_info "当前 Docker 磁盘占用:"
  docker system df || true
  echo
  log_info "悬空镜像:"
  docker images -f dangling=true --format '{{.ID}}  {{.Size}}  {{.CreatedSince}}' || true
  echo
  log_info "已退出容器:"
  docker ps -a -f status=exited --format '{{.ID}}  {{.Names}}  {{.Status}}' || true
  echo
  log_info "BuildKit 缓存:"
  docker builder du 2>/dev/null || true
  echo
  log_info "容器 json 日志 > ${CONTAINER_LOG_MAX}:"
  find /var/lib/docker/containers -name '*-json.log' -size "+${CONTAINER_LOG_MAX}" \
    -printf '  %p (%s bytes)\n' 2>/dev/null \
    || true
}

run_or_echo() {
  if [ "$DRY_RUN" -eq 1 ]; then
    log_info "(dry-run) $*"
    return 0
  fi
  "$@"
}

truncate_huge_container_logs() {
  local f size
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    size="$(wc -c <"$f" | tr -d ' ')"
    log_info "截断容器日志 ${f} ($(bytes_human "$size"))"
    run_or_echo truncate -s 0 "$f"
  done < <(find /var/lib/docker/containers -name '*-json.log' -size "+${CONTAINER_LOG_MAX}" -print 2>/dev/null || true)
}

prune_now() {
  local before after pct
  before="$(root_disk_pct)"
  log_info "根盘使用率 ${before}%"
  print_df

  log_info "清理悬空镜像 / 已退出容器 / 未用网络"
  run_or_echo docker image prune -f
  run_or_echo docker container prune -f
  run_or_echo docker network prune -f

  if [ "$SKIP_BUILDER" -eq 0 ]; then
    log_info "清理悬空 BuildKit 缓存（保留仍被当前镜像引用的层）"
    run_or_echo docker builder prune -f
    pct="$(root_disk_pct)"
    if [ "$pct" -ge "$DISK_AGGRESSIVE_PCT" ]; then
      log_warn "根盘 ${pct}% ≥ ${DISK_AGGRESSIVE_PCT}%，追加清理 24h 前未用 build cache"
      run_or_echo docker builder prune -af --filter until=24h
    fi
  else
    log_info "跳过 BuildKit 缓存（--skip-builder）"
  fi

  truncate_huge_container_logs

  after="$(root_disk_pct)"
  log_success "清理完成: 根盘 ${before}% → ${after}%"
  print_df
  docker system df || true
}

main() {
  parse_args "$@"
  check_root

  if ! command -v docker >/dev/null 2>&1; then
    log_warn "未安装 docker，跳过"
    exit 0
  fi

  if is_compose_build_running; then
    log_warn "检测到 docker compose build 正在进行，跳过以免拖慢/打断构建"
    exit 0
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    log_info "dry-run：只报告，不删除"
    print_df
    report_reclaimable
    exit 0
  fi

  prune_now
}

main "$@"
