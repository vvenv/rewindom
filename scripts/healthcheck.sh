#!/bin/bash
# 服务器健康检查：一条命令回答「这台机器现在有没有问题」。
#
# 由 Ops workflow 的 health-check 任务与 Monitor 定时工作流调用，也可手工跑。
# 任何一项不过就以非零退出——定时工作流因此变红，GitHub 会发通知。
# 这是在不引入任何监控厂商的前提下，能拿到的最实在的一层告警。
#
# 检查项（每一项都对应一种「平时没感觉、出事才知道」的故障）:
#   1. /ready         —— 应用能不能接流量（Postgres 是硬依赖）
#   2. 容器           —— 四个容器都在跑，且带健康检查的那个是 healthy
#   3. 磁盘           —— 应用与数据库同盘，写满先挂的是 Postgres
#   4. 备份新鲜度     —— 最新备份不能太旧。备份**静默停掉**是最贵的故障：
#                        平时毫无感觉，需要它的那天什么都没有
#
# 用法:
#   ./scripts/healthcheck.sh --env production
#   ./scripts/healthcheck.sh --env test --max-backup-age 48
#   ./scripts/healthcheck.sh --skip-backup     # 还没装定时备份时
#
# 环境变量覆盖（本地用同构栈验证本脚本时用）:
#   CONTAINER_PREFIX=rewindom-verify HEALTHCHECK_URL=http://host:3799 ./scripts/healthcheck.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"

ENVIRONMENT="production"
MAX_BACKUP_AGE_HOURS=36
DISK_THRESHOLD=85
SKIP_BACKUP=0
FAILURES=()

usage() {
  sed -n '3,22p' "$0"
  exit 0
}

parse_args() {
  while [ $# -gt 0 ]; do
    case $1 in
      --env)             ENVIRONMENT="$2"; shift 2 ;;
      --max-backup-age)  MAX_BACKUP_AGE_HOURS="$2"; shift 2 ;;
      --disk-threshold)  DISK_THRESHOLD="$2"; shift 2 ;;
      --skip-backup)     SKIP_BACKUP=1; shift ;;
      --help|-h)         usage ;;
      *)                 log_error "未知参数: $1"; exit 1 ;;
    esac
  done

  if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "test" ]; then
    log_error "无效的环境参数: $ENVIRONMENT"
    exit 1
  fi

  # 前缀与探针地址都允许覆盖：本地拿一套同构栈验证这个脚本时用得上，
  # 服务器上不设即按环境取默认值。
  if [ "$ENVIRONMENT" = "test" ]; then
    CONTAINER_PREFIX="${CONTAINER_PREFIX:-rewindom-test}"
    BACKUP_DIR="${BACKUP_DIR:-/backups/test}"
    APP_PORT_DEFAULT=3702
    DOCKER_DIR="/opt/rewindom-docker-test"
  else
    CONTAINER_PREFIX="${CONTAINER_PREFIX:-rewindom}"
    BACKUP_DIR="${BACKUP_DIR:-/var/backups/app}"
    APP_PORT_DEFAULT=3700
    DOCKER_DIR="/opt/rewindom-docker"
  fi
}

fail() {
  FAILURES+=("$1")
  log_error "$1"
}

pass() {
  log_success "$1"
}

# 端口从部署目录的 env 文件里读，读不到用默认值
resolve_app_port() {
  local env_file port
  for env_file in "$DOCKER_DIR/.env.production" "$DOCKER_DIR/.env.test"; do
    [ -f "$env_file" ] || continue
    port="$(grep -E '^APP_PORT=' "$env_file" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '[:space:]')"
    if [ -n "$port" ]; then
      echo "$port"
      return
    fi
  done
  echo "$APP_PORT_DEFAULT"
}

check_ready() {
  local port url body
  port="$(resolve_app_port)"
  url="${HEALTHCHECK_URL:-http://127.0.0.1:${port}}/ready"

  body="$(curl -fsS --max-time 10 "$url" 2>/dev/null)"
  if [ -n "$body" ]; then
    pass "/ready 正常（${url}）: ${body}"
  else
    fail "/ready 不可用（${url}）——应用没在接流量"
  fi
}

check_containers() {
  if ! command -v docker >/dev/null 2>&1; then
    fail "机器上没有 docker"
    return
  fi

  local svc name state health
  for svc in postgres redis app web; do
    name="${CONTAINER_PREFIX}-${svc}"
    state="$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null)"
    if [ "$state" != "running" ]; then
      fail "容器 ${name} 未在运行（状态: ${state:-不存在}）"
      continue
    fi
    # 只有 app 配了 healthcheck；没配的容器 .State.Health 为空，不算失败
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$name" 2>/dev/null)"
    if [ -n "$health" ] && [ "$health" != "healthy" ]; then
      fail "容器 ${name} 健康状态为 ${health}"
    else
      pass "容器 ${name} 运行中${health:+（${health}）}"
    fi
  done
}

check_disk() {
  local usage
  usage="$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
  if [ -z "$usage" ]; then
    fail "读不到磁盘使用率"
    return
  fi
  if [ "$usage" -ge "$DISK_THRESHOLD" ]; then
    fail "磁盘使用率 ${usage}%（阈值 ${DISK_THRESHOLD}%）——应用与数据库同盘，写满先挂的是 Postgres"
  else
    pass "磁盘使用率 ${usage}%"
  fi
}

# 最新备份的年龄。这一项是本脚本存在的主要理由：
# 备份坏掉不会有任何征兆，cron 每天照跑、日志里只有一行失败。
check_backup_freshness() {
  if [ "$SKIP_BACKUP" = "1" ]; then
    log_warn "已跳过备份新鲜度检查（--skip-backup）"
    return
  fi
  if [ ! -d "$BACKUP_DIR" ]; then
    fail "备份目录不存在: ${BACKUP_DIR}（定时备份没装？./scripts/backup-cron.sh install）"
    return
  fi

  local newest age_seconds age_hours
  newest="$(find "$BACKUP_DIR" -maxdepth 1 -name 'app_backup_*.dump' ! -name '*safety*' ! -name '*.partial' \
    -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"
  if [ -z "$newest" ]; then
    fail "备份目录里没有任何数据库备份: ${BACKUP_DIR}"
    return
  fi

  age_seconds=$(( $(date +%s) - $(stat -c %Y "$newest" 2>/dev/null || echo 0) ))
  age_hours=$(( age_seconds / 3600 ))
  if [ "$age_hours" -ge "$MAX_BACKUP_AGE_HOURS" ]; then
    fail "最新备份已 ${age_hours} 小时（上限 ${MAX_BACKUP_AGE_HOURS}h）: $(basename "$newest")"
  else
    pass "最新备份 ${age_hours} 小时前: $(basename "$newest")"
  fi

  # 附件备份是后加的；缺了只告警不判失败，避免刚升级的机器直接变红
  if ! find "$BACKUP_DIR" -maxdepth 1 -name 'app_data_*.tar.gz' -print -quit 2>/dev/null | grep -q .; then
    log_warn "没有应用数据（/data）备份——附件不在备份范围内，见 docs/deployment.md"
  fi
}

main() {
  parse_args "$@"
  log_info "健康检查: ${ENVIRONMENT}（容器前缀 ${CONTAINER_PREFIX}）"

  check_ready
  check_containers
  check_disk
  check_backup_freshness

  echo
  if [ "${#FAILURES[@]}" -eq 0 ]; then
    log_success "全部通过"
    exit 0
  fi
  log_error "${#FAILURES[@]} 项未通过:"
  local f
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
}

main "$@"
