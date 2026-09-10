#!/bin/bash
# 把本地 env 文件里的值导入 GitHub Actions 的环境 Secrets / Variables。
#
# ## 为什么是「导入」而不是「生成」
#
# 这个仓库长期是从开发机 `pnpm deploy` 部署的，真值都在本地 .env.production 里。
# 要让 CI 也能部署，就得让 GitHub 拿到**同一套**值——而不是重新生成一套：
#
#   DB_PASSWORD                  重新生成 → 连不上已有的 postgres 卷（卷里是旧密码）
#   TENANT_SECRET_ENCRYPTION_KEY 重新生成 → 已存的租户密文**永久解不开**
#   JWT_SECRET                   重新生成 → 所有人被登出（可接受，但要知情）
#
# 所以默认只导入，不生成。全新环境请先自己生成再写进 env 文件：
#   openssl rand -base64 24   # DB_PASSWORD
#   openssl rand -base64 48   # JWT_SECRET
#   openssl rand -hex 32      # TENANT_SECRET_ENCRYPTION_KEY（必须 32 字节）
#
# ## 值不会被打印
#
# 脚本从不 echo 任何值，只报告键名与结果；值经管道直接交给 `gh`，不进 argv
# （argv 会出现在 `ps` 里）。
#
# 用法:
#   ./scripts/setup-actions-secrets.sh --dry-run          # 先看会写哪些
#   ./scripts/setup-actions-secrets.sh
#   ./scripts/setup-actions-secrets.sh --ssh-key ~/.ssh/id_ed25519
#   ./scripts/setup-actions-secrets.sh --file .env.test --env test

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"

ENV_FILE="${ROOT}/.env.production"
GH_ENV="production"
SSH_KEY_FILE=""
DRY_RUN=0

# workflows 通过 secrets.* 取的键（见 .github/workflows/*.yml）
SECRET_KEYS=(
  DEPLOY_HOST
  DEPLOY_SSH_USER
  DEPLOY_SSH_PASSWORD
  DB_PASSWORD
  JWT_SECRET
  TENANT_SECRET_ENCRYPTION_KEY
  APP_DOMAIN
  APP_PORT
  SSL_EMAIL
  REDIS_PASSWORD
  PLATFORM_ADMIN_USERNAME
  PLATFORM_ADMIN_PASSWORD
  LOG_LEVEL
  OPENAI_API_KEY
  OPENAI_BASE_URL
  OPENAI_MODEL
)

# 缺了就无法部署 / 应用起不来的
REQUIRED_KEYS=(
  DEPLOY_HOST
  DEPLOY_SSH_USER
  DB_PASSWORD
  JWT_SECRET
  TENANT_SECRET_ENCRYPTION_KEY
  APP_DOMAIN
)

# 非机密，走 Variables（在日志里可见、可审计）
VARIABLE_KEYS=(
  SITE_CSP_MODE
  BACKUP_OFFSITE_DEST
)

usage() {
  sed -n '3,30p' "$0"
  exit 0
}

parse_args() {
  while [ $# -gt 0 ]; do
    case $1 in
      --file)     ENV_FILE="$2"; shift 2 ;;
      --env)      GH_ENV="$2"; shift 2 ;;
      --ssh-key)  SSH_KEY_FILE="$2"; shift 2 ;;
      --dry-run)  DRY_RUN=1; shift ;;
      --help|-h)  usage ;;
      *)          log_die "未知参数: $1" ;;
    esac
  done
}

check_prereqs() {
  command -v gh >/dev/null 2>&1 || log_die "未安装 gh CLI"
  gh auth status >/dev/null 2>&1 || log_die "gh 未登录：先跑 gh auth login"
  [ -f "$ENV_FILE" ] || log_die "env 文件不存在: $ENV_FILE"
}

# 从 env 文件里取值。只取第一处定义，去掉首尾引号。**不打印**。
env_value() {
  local key="$1" line
  line="$(grep -m1 -E "^${key}=" "$ENV_FILE" 2>/dev/null || true)"
  [ -n "$line" ] || return 1
  line="${line#*=}"
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  [ -n "$line" ] || return 1
  printf '%s' "$line"
}

# 值经 stdin 交给 gh：不进 argv，`ps` 里看不到
set_secret() {
  local key="$1" value="$2"
  if [ "$DRY_RUN" = "1" ]; then
    log_info "  [dry-run] 会设置 secret ${key}"
    return 0
  fi
  if printf '%s' "$value" | gh secret set "$key" --env "$GH_ENV" >/dev/null 2>&1; then
    log_success "  secret ${key}"
  else
    log_error "  secret ${key} 设置失败"
    return 1
  fi
}

set_variable() {
  local key="$1" value="$2"
  if [ "$DRY_RUN" = "1" ]; then
    log_info "  [dry-run] 会设置 variable ${key}"
    return 0
  fi
  if gh variable set "$key" --env "$GH_ENV" --body "$value" >/dev/null 2>&1; then
    log_success "  variable ${key}"
  else
    log_error "  variable ${key} 设置失败"
    return 1
  fi
}

main() {
  parse_args "$@"
  check_prereqs

  log_info "来源: ${ENV_FILE}"
  log_info "目标: GitHub 环境 ${GH_ENV}"
  [ "$DRY_RUN" = "1" ] && log_warn "dry-run：只报告，不写入"

  local key value
  local -a missing=() skipped=()

  log_info "导入 Secrets..."
  for key in "${SECRET_KEYS[@]}"; do
    if value="$(env_value "$key")"; then
      set_secret "$key" "$value"
    else
      skipped+=("$key")
    fi
  done

  # SSH 私钥单独给：它不在 env 文件里，且比密码更该用
  if [ -n "$SSH_KEY_FILE" ]; then
    [ -f "$SSH_KEY_FILE" ] || log_die "SSH 私钥不存在: $SSH_KEY_FILE"
    case "$(head -1 "$SSH_KEY_FILE")" in
      *PRIVATE\ KEY*) : ;;
      *) log_die "$SSH_KEY_FILE 看起来不是私钥（是不是给成 .pub 了？）" ;;
    esac
    if [ "$DRY_RUN" = "1" ]; then
      log_info "  [dry-run] 会从 ${SSH_KEY_FILE} 设置 secret DEPLOY_SSH_KEY"
    elif gh secret set DEPLOY_SSH_KEY --env "$GH_ENV" < "$SSH_KEY_FILE" >/dev/null 2>&1; then
      log_success "  secret DEPLOY_SSH_KEY（来自 ${SSH_KEY_FILE}）"
    else
      log_error "  secret DEPLOY_SSH_KEY 设置失败"
    fi
  fi

  log_info "导入 Variables..."
  for key in "${VARIABLE_KEYS[@]}"; do
    if value="$(env_value "$key")"; then
      set_variable "$key" "$value"
    else
      skipped+=("$key")
    fi
  done

  for key in "${REQUIRED_KEYS[@]}"; do
    env_value "$key" >/dev/null || missing+=("$key")
  done

  echo
  if [ "${#skipped[@]}" -gt 0 ]; then
    log_info "env 文件里没有（跳过，多数是可选项）: ${skipped[*]}"
  fi
  if [ "${#missing[@]}" -gt 0 ]; then
    log_error "缺少必需项，CI 部署会失败: ${missing[*]}"
    exit 1
  fi

  log_success "完成。核对: gh secret list --env ${GH_ENV}"
  if [ -z "$SSH_KEY_FILE" ]; then
    log_warn "未设置 DEPLOY_SSH_KEY——CI 会回落到密码登录。建议改用密钥："
    log_warn "  ./scripts/setup-actions-secrets.sh --ssh-key ~/.ssh/id_ed25519"
  fi
}

main "$@"
