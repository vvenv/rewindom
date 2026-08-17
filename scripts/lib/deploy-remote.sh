# SSH 远程操作封装（Docker 部署、DB 同步等共用）
# 用法: ROOT=/path/to/repo source scripts/lib/deploy-remote.sh
#       load_deploy_credentials production
#       _run_ssh "echo hello"

if [ -z "${ROOT:-}" ]; then
  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

# shellcheck source=scripts/lib/release-deploy-config.sh
source "$ROOT/scripts/lib/release-deploy-config.sh"
# shellcheck source=scripts/lib/deploy-env.sh
source "$ROOT/scripts/lib/deploy-env.sh"
# shellcheck source=scripts/lib/log.sh
source "$ROOT/scripts/lib/log.sh"

deploy_remote_info()  { log_info "$@"; }
deploy_remote_error() { log_die "$@"; }

_deploy_override_var() {
  local suffix="$1"
  eval "echo \"\${${DEPLOY_OVERRIDE_PREFIX}_DEPLOY_${suffix}:-}\""
}

_ssh_auth_failure_in_stderr() {
  local stderr_file="$1"
  grep -qiE 'permission denied.*(publickey|password|keyboard|please try again)|authentication fail' "$stderr_file"
}

# 加载目标环境 dotenv（.env.production / .env.test）
# 凭证统一使用 DEPLOY_HOST / DEPLOY_SSH_USER / DEPLOY_SSH_PASSWORD
load_deploy_credentials() {
  local environment="${1:-production}"

  load_deploy_env "$ROOT" "$environment"

  local override_host override_user override_password
  override_host="$(_deploy_override_var HOST)"
  override_user="$(_deploy_override_var SSH_USER)"
  override_password="$(_deploy_override_var SSH_PASSWORD)"

  DEPLOY_ENVIRONMENT="$environment"
  DEPLOY_HOST="${override_host:-${DEPLOY_HOST:-}}"
  DEPLOY_SSH_USER="${override_user:-${DEPLOY_SSH_USER:-root}}"
  DEPLOY_SSH_PASSWORD="${override_password:-${DEPLOY_SSH_PASSWORD:-}}"

  if [ -z "$DEPLOY_HOST" ]; then
    local env_file
    env_file="$(deploy_env_file_for "$ROOT" "$environment")"
    deploy_remote_error "未配置 SSH 主机。复制 scripts/env.${environment}.example 为 ${env_file}，设置 DEPLOY_HOST / DEPLOY_SSH_USER / DEPLOY_SSH_PASSWORD"
  fi
}

_ssh_common_opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o TCPKeepAlive=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3)

# 本地是终端时注入 FORCE_COLOR，供远程 log.sh / 工具链着色（尊重 NO_COLOR）
_ssh_force_color_prefix() {
  if [ -n "${NO_COLOR:-}" ]; then
    return 0
  fi
  if [ -t 1 ] || [ -t 2 ] || [ "${FORCE_COLOR:-0}" = "1" ]; then
    printf '%s' 'export FORCE_COLOR=1; '
  fi
}

# 是否给远程分配 pty：compose / 构建输出靠 TTY 着色。
# SSH_ALLOCATE_TTY=1 强制开；=0 强制关；未设则本地终端且未禁色时自动开。
_ssh_should_allocate_tty() {
  case "${SSH_ALLOCATE_TTY:-}" in
    1) return 0 ;;
    0) return 1 ;;
  esac
  if [ -n "${NO_COLOR:-}" ]; then
    return 1
  fi
  [ -t 1 ] || [ -t 2 ] || [ "${FORCE_COLOR:-0}" = "1" ]
}

_require_sshpass() {
  if ! command -v sshpass >/dev/null 2>&1; then
    deploy_remote_error "已配置 SSH 密码但未安装 sshpass。请 brew install sshpass，或改用 SSH 密钥并留空密码变量"
  fi
}

_ssh_auth_failure_hint() {
  deploy_remote_error "SSH 认证失败: ${DEPLOY_SSH_USER}@${DEPLOY_HOST}

请检查对应环境文件（.env.production / .env.test）中的 DEPLOY_SSH_PASSWORD 是否正确。
也可手动验证:
  ssh ${DEPLOY_SSH_USER}@${DEPLOY_HOST}
若已配置 SSH 密钥，可删除或注释 DEPLOY_SSH_PASSWORD（脚本会优先使用密钥）。"
}

_ssh_try_key() {
  local mode="$1"
  local stderr_file="$2"
  shift 2

  if [ "$mode" = "scp" ]; then
    scp "${_ssh_common_opts[@]}" -o BatchMode=yes "$@" 2>"$stderr_file"
    return $?
  fi

  local remote_cmd="$1"
  if _ssh_should_allocate_tty; then
    ssh "${_ssh_common_opts[@]}" -tt -o BatchMode=yes \
      "${DEPLOY_SSH_USER}@${DEPLOY_HOST}" "$remote_cmd" 2>"$stderr_file"
  else
    ssh "${_ssh_common_opts[@]}" -o BatchMode=yes \
      "${DEPLOY_SSH_USER}@${DEPLOY_HOST}" "$remote_cmd" 2>"$stderr_file"
  fi
}

_ssh_try_password() {
  local mode="$1"
  local stderr_file="$2"
  shift 2

  _require_sshpass
  if [ "$mode" = "scp" ]; then
    SSHPASS="$DEPLOY_SSH_PASSWORD" sshpass -e scp \
      "${_ssh_common_opts[@]}" \
      -o PreferredAuthentications=password \
      -o PubkeyAuthentication=no \
      "$@" 2>"$stderr_file"
    return $?
  fi

  local remote_cmd="$1"
  if _ssh_should_allocate_tty; then
    SSHPASS="$DEPLOY_SSH_PASSWORD" sshpass -e ssh \
      "${_ssh_common_opts[@]}" -tt \
      -o PreferredAuthentications=password \
      -o PubkeyAuthentication=no \
      "${DEPLOY_SSH_USER}@${DEPLOY_HOST}" "$remote_cmd" 2>"$stderr_file"
  else
    SSHPASS="$DEPLOY_SSH_PASSWORD" sshpass -e ssh \
      "${_ssh_common_opts[@]}" \
      -o PreferredAuthentications=password \
      -o PubkeyAuthentication=no \
      "${DEPLOY_SSH_USER}@${DEPLOY_HOST}" "$remote_cmd" 2>"$stderr_file"
  fi
}

# ssh/scp 失败必须自己记 rc。调用方脚本是 `set -e`，直接 `_ssh_try_key; rc=$?`
# 会在赋值前退出；stderr 又被重定向到临时文件，表现为「确认后立刻 255、无任何报错」，
# 密码回退（sshpass）也永远走不到。
# 也不可写成 `if _ssh_try_key; then`——if 成功后 $? 恒为 0，远程失败会被误报成功。
_ssh_try_key_then_password() {
  local mode="$1"
  local stderr_file="$2"
  shift 2
  local rc

  set +e
  _ssh_try_key "$mode" "$stderr_file" "$@"
  rc=$?
  if [ "$rc" -ne 0 ] && { [ "$rc" -eq 255 ] || _ssh_auth_failure_in_stderr "$stderr_file"; } && [ -n "${DEPLOY_SSH_PASSWORD:-}" ]; then
    _ssh_try_password "$mode" "$stderr_file" "$@"
    rc=$?
  fi
  set -e
  return "$rc"
}

_ssh_fail() {
  local stderr_file="$1"
  local rc="$2"
  cat "$stderr_file" >&2
  if _ssh_auth_failure_in_stderr "$stderr_file"; then
    rm -f "$stderr_file"
    _ssh_auth_failure_hint
  fi
  rm -f "$stderr_file"
  exit "$rc"
}

_run_scp() {
  local stderr_file rc
  stderr_file="$(mktemp)"

  _ssh_try_key_then_password scp "$stderr_file" "$@"
  rc=$?
  if [ "$rc" -eq 0 ]; then
    rm -f "$stderr_file"
    return 0
  fi
  _ssh_fail "$stderr_file" "$rc"
}

_run_ssh() {
  local remote_cmd
  remote_cmd="$(_ssh_force_color_prefix)$1"
  local stderr_file rc
  stderr_file="$(mktemp)"

  _ssh_try_key_then_password ssh "$stderr_file" "$remote_cmd"
  rc=$?
  if [ "$rc" -eq 0 ]; then
    rm -f "$stderr_file"
    return 0
  fi
  _ssh_fail "$stderr_file" "$rc"
}

