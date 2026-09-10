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
#   ./scripts/setup-actions-secrets.sh --setup-ssh    # 装公钥 + 验证 + 上传私钥，一条龙
#   ./scripts/setup-actions-secrets.sh --file .env.test --env test

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"

ENV_FILE="${ROOT}/.env.production"
GH_ENV="production"
SSH_KEY_FILE=""
SETUP_SSH=0
DEPLOY_KEY_DEFAULT="${HOME}/.ssh/rewindom_deploy"
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
      --setup-ssh) SETUP_SSH=1; shift ;;
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

# 把公钥装到服务器，并验证密钥登录真的通了。
#
# 装公钥需要先用密码登一次——这一步只能在**你自己的**进程里做。
# 优先用 .env.production 里已有的 DEPLOY_SSH_PASSWORD（与 deploy-remote.sh 同一套做法），
# 没有 sshpass 就回落到 ssh-copy-id 交互提示。
setup_ssh_key() {
  local key="${SSH_KEY_FILE:-$DEPLOY_KEY_DEFAULT}"
  local host user password

  host="$(env_value DEPLOY_HOST)" || log_die "env 文件里没有 DEPLOY_HOST"
  user="$(env_value DEPLOY_SSH_USER)" || log_die "env 文件里没有 DEPLOY_SSH_USER"

  if [ ! -f "$key" ]; then
    log_info "生成部署专用密钥: ${key}"
    # 无口令：CI 里没人能输入口令。用专用密钥而不是个人密钥，
    # 万一泄露只波及部署，不波及你的其它服务器。
    ssh-keygen -t ed25519 -f "$key" -N "" -C "github-actions@rewindom" >/dev/null
  fi
  [ -f "${key}.pub" ] || log_die "找不到公钥: ${key}.pub"

  if [ "$DRY_RUN" = "1" ]; then
    log_info "[dry-run] 会把 ${key}.pub 装到 ${user}@<host>，再上传 ${key} 为 DEPLOY_SSH_KEY"
    SSH_KEY_FILE="$key"
    return 0
  fi

  if ssh -i "$key" -o BatchMode=yes -o ConnectTimeout=8 \
      -o StrictHostKeyChecking=accept-new "${user}@${host}" true 2>/dev/null; then
    log_success "密钥登录已可用，跳过安装"
  else
    log_info "安装公钥到服务器（需要密码认证一次）..."
    password="$(env_value DEPLOY_SSH_PASSWORD || true)"
    if [ -n "${password:-}" ] && command -v sshpass >/dev/null 2>&1; then
      SSHPASS="$password" sshpass -e ssh-copy-id -i "${key}.pub" \
        -o StrictHostKeyChecking=accept-new "${user}@${host}" >/dev/null 2>&1 \
        || log_die "ssh-copy-id 失败（密码不对？服务器禁了密码登录？）"
    else
      log_warn "没有 sshpass 或 env 里没有密码——下面会提示你输入服务器密码"
      ssh-copy-id -i "${key}.pub" -o StrictHostKeyChecking=accept-new "${user}@${host}" \
        || log_die "ssh-copy-id 失败"
    fi

    # 装完必须验证：装上了但登不进去是常见情形，不验证就上传等于把一把
    # 打不开门的钥匙交给 CI，而你要到下次部署失败才发现。
    if ! ssh -i "$key" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=8 \
        "${user}@${host}" true 2>/dev/null; then
      diagnose_key_auth "$key" "$user" "$host"
    fi
    log_success "密钥登录已验证可用"
  fi

  SSH_KEY_FILE="$key"
}

# 验证失败时给出**可执行的**下一步，而不是一句「请手工排查」。
#
# 最常见的两类原因表现完全不同，值得分开说：
#   服务器压根不提供 publickey  → sshd 配置问题，改 sshd_config
#   提供了但这把钥匙被拒        → authorized_keys / 权限 / SELinux
diagnose_key_auth() {
  local key="$1" user="$2" host="$3" methods

  methods="$(ssh -v -i "$key" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=8 \
    "${user}@${host}" true 2>&1 | grep -m1 "Authentications that can continue" || true)"

  log_error "密钥登录不通，未上传 DEPLOY_SSH_KEY。"
  if [ -n "$methods" ] && ! printf '%s' "$methods" | grep -q "publickey"; then
    log_error "原因：服务器**不提供** publickey 认证（${methods#*: }）——"
    log_error "      公钥装进去了，但 sshd 不接受公钥登录，客户端连试的机会都没有。"
    log_error ""
    log_error "在服务器上（保持当前会话别断，免得把自己锁在外面）："
    log_error "  grep -rniE '^[[:space:]]*PubkeyAuthentication' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/"
    log_error "  # 把找到的那处改成 yes（注意 sshd_config.d/ 下的覆盖优先级更高）"
    log_error "  sshd -t && systemctl reload sshd    # 先语法检查再重载"
    log_error ""
    log_error "改完重跑：./scripts/setup-actions-secrets.sh --setup-ssh"
  else
    log_error "原因：服务器提供了 publickey，但这把钥匙被拒。多半是权限或路径："
    log_error "  ls -ld ~/.ssh && ls -l ~/.ssh/authorized_keys   # 需 700 / 600，家目录不能组可写"
    log_error "  grep -i AuthorizedKeysFile /etc/ssh/sshd_config"
    log_error "  restorecon -Rv ~/.ssh                            # RHEL 系的 SELinux 上下文"
  fi
  exit 1
}

main() {
  parse_args "$@"
  check_prereqs

  if [ "$SETUP_SSH" = "1" ]; then
    setup_ssh_key
  fi

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
