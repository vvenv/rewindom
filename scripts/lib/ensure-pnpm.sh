#!/bin/bash
# 按 package.json 的 packageManager 激活 pnpm（corepack），避免服务器旧版 pnpm 解析新 lockfile 崩溃。
# 用法（需先 source log.sh）:
#   source scripts/lib/ensure-pnpm.sh
#   ensure_pnpm_ready            # 在含 package.json 的目录下
#   ensure_pnpm_ready "$APP_DIR"
#   run_pnpm install --frozen-lockfile

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  echo "用法: source $(basename "$0")"
  exit 0
fi

# 解析 "pnpm@x.y.z"；失败时返回空
_read_package_manager_pnpm_version() {
  local pkg_json="$1"
  if [ ! -f "$pkg_json" ]; then
    return 1
  fi
  # 避免依赖 jq；packageManager 在根 package.json 中为单行字段
  sed -n 's/.*"packageManager"[[:space:]]*:[[:space:]]*"pnpm@\([^"]*\)".*/\1/p' "$pkg_json" | head -n1
}

ensure_pnpm_ready() {
  local app_dir="${1:-.}"
  local pkg_json="${app_dir}/package.json"
  local wanted current

  wanted="$(_read_package_manager_pnpm_version "$pkg_json")"
  if [ -z "$wanted" ]; then
    log_die "ensure_pnpm: ${pkg_json} 未声明 packageManager pnpm@x.y.z"
  fi

  ENSURE_PNPM_VERSION="$wanted"

  if command -v pnpm >/dev/null 2>&1; then
    current="$(pnpm -v 2>/dev/null || true)"
    if [ "$current" = "$wanted" ]; then
      ENSURE_PNPM_USE_COREPACK=0
      log_info "pnpm ${wanted} 已就绪"
      return 0
    fi
  else
    current=""
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    log_die "需要 corepack（Node.js ≥16.10 自带）以激活 pnpm@${wanted}；当前 pnpm=${current:-missing}"
  fi

  log_info "激活 pnpm@${wanted}（当前: ${current:-missing}）..."
  corepack enable
  corepack prepare "pnpm@${wanted}" --activate

  # 系统可能仍有 /usr/bin/pnpm 旧版抢 PATH；安装时一律走 corepack pnpm
  ENSURE_PNPM_USE_COREPACK=1
  current="$(corepack pnpm -v 2>/dev/null || true)"
  if [ "$current" != "$wanted" ]; then
    log_die "corepack 激活后 pnpm 仍为 ${current:-missing}，期望 ${wanted}"
  fi
  log_info "将使用 corepack pnpm@${wanted}（忽略 PATH 中的旧 pnpm）"
}

run_pnpm() {
  if [ "${ENSURE_PNPM_USE_COREPACK:-0}" = "1" ]; then
    corepack pnpm "$@"
  else
    pnpm "$@"
  fi
}
