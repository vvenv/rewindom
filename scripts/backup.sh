#!/bin/bash
# 数据备份脚本（在服务器上以 root 运行；由 backup-cron.sh 定时或手动调用）
#
# 备份三样东西，缺一不可：
#   PostgreSQL  <BACKUP_DIR>/app_backup_<时间戳>.dump       (pg_dump custom 格式)
#   应用数据卷  <BACKUP_DIR>/app_data_<时间戳>.tar.gz       (/data：附件与导出件)
#   Redis       <BACKUP_DIR>/app_redis_backup_<时间戳>.rdb.gz
#
# 用法:
#   ./scripts/backup.sh --env production      # 默认
#   ./scripts/backup.sh --env test
#   ./scripts/backup.sh --skip-data           # 只跑 PG + Redis
#   ./scripts/backup.sh --help
#
# 备份目录:
#   production → /var/backups/app
#   test       → /backups/test
#
# 异地副本（强烈建议开启）:
#   备份与数据库在同一台机器上，机器没了备份一起没。设置 BACKUP_OFFSITE_DEST
#   即可在每次备份后把产物推走，用 rclone 远端或 s3:// 路径皆可：
#     BACKUP_OFFSITE_DEST=s3://my-bucket/rewindom/production   # 需要 aws cli
#     BACKUP_OFFSITE_DEST=r2:rewindom-backups/production       # 需要 rclone
#   配了却推不上去会**直接失败**：静默的异地备份等于没有异地备份。
#
# 文件名模式 app_backup_* / app_data_* / app_redis_* 被 backup-cron.sh 的保留策略
# 引用，改动需同步。安全备份（restore.sh 生成）命名为 app_backup_safety_*.dump。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"
# shellcheck source=lib/stack.sh
source "${SCRIPT_DIR}/lib/stack.sh"

# 配置文件。**cron 跑起来的进程环境几乎是空的**——没有它，
# BACKUP_OFFSITE_DEST 这类变量永远读不到，异地备份就成了「文档里有、实际不跑」。
# 手工执行时进程环境优先（下面用 : "${VAR:=...}" 而不是直接赋值）。
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/etc/rewindom/backup.env}"
if [ -f "$BACKUP_ENV_FILE" ]; then
  # 进程环境优先于文件：`set -a; source` 会**无条件覆盖**，
  # 手工执行时命令行上传的值会被文件里的旧值吃掉。先记下再放回。
  _preset_offsite="${BACKUP_OFFSITE_DEST:-}"
  _preset_dir="${BACKUP_DIR:-}"
  _preset_compress="${DATABASE_BACKUP_COMPRESS:-}"
  # shellcheck disable=SC1090
  set -a
  source "$BACKUP_ENV_FILE"
  set +a
  if [ -n "$_preset_offsite" ]; then BACKUP_OFFSITE_DEST="$_preset_offsite"; fi
  if [ -n "$_preset_dir" ]; then BACKUP_DIR="$_preset_dir"; fi
  if [ -n "$_preset_compress" ]; then DATABASE_BACKUP_COMPRESS="$_preset_compress"; fi
  unset _preset_offsite _preset_dir _preset_compress
fi

ENVIRONMENT="production"
SKIP_DATA=0
DATABASE_BACKUP_COMPRESS="${DATABASE_BACKUP_COMPRESS:-6}"
# 进程环境 > backup.env > 空
: "${BACKUP_OFFSITE_DEST:=}"

usage() {
  sed -n '3,30p' "$0"
  exit 0
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --env)
        ENVIRONMENT="$2"
        shift 2
        ;;
      --skip-data)
        SKIP_DATA=1
        shift
        ;;
      --help|-h)
        usage
        ;;
      *)
        log_error "未知参数: $1"
        exit 1
        ;;
    esac
  done

  if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "test" ]; then
    log_die "无效的环境参数: $ENVIRONMENT (仅支持 production 或 test)"
  fi

  # 容器名按环境分（与 compose 的 CONTAINER_PREFIX 同源）。必须在 stack_init 之前。
  if [ "$ENVIRONMENT" = "test" ]; then
    stack_set_container_prefix "rewindom-test"
  fi
  stack_init

  if [ "$ENVIRONMENT" = "test" ]; then
    BACKUP_DIR="${BACKUP_DIR:-/backups/test}"
    DB_FALLBACK="app_test"
  else
    BACKUP_DIR="${BACKUP_DIR:-/var/backups/app}"
    DB_FALLBACK="rewindom"
  fi

  # 库名以运行中的容器为准。历史上这里按 --env 硬映射成 rewindom / app_test，
  # 而 compose 的 POSTGRES_DB 恒为 rewindom——test 环境备的是一个不存在的库。
  DB_NAME="$(stack_pg_db_name "$DB_FALLBACK")"

  log_info "备份环境: $ENVIRONMENT"
  log_info "数据库: $DB_NAME (拓扑: $(stack_pg_mode))"
  log_info "备份目录: $BACKUP_DIR"
}

# 权限要求随拓扑而变：容器模式只需要能用 docker（很多机器上部署用户就在 docker 组里），
# 宿主机模式才必须是 root（要 sudo -u postgres）。
check_privileges() {
  if [ "$(stack_pg_mode)" = "host" ] || [ "$(stack_redis_mode)" = "host" ]; then
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
      log_die "宿主机拓扑下请使用 root 运行此脚本"
    fi
    return
  fi
  if ! docker info >/dev/null 2>&1; then
    log_die "无法访问 docker（需要 root 或加入 docker 组）"
  fi
}

timestamp() {
  date +%Y%m%d_%H%M%S
}

# 等待 Redis BGSAVE 完成：轮询 LASTSAVE 时间戳直到推进，替代固定 sleep
wait_redis_bgsave() {
  local before after attempts
  before="$(stack_redis_cli LASTSAVE 2>/dev/null | tr -d '[:space:]')"
  if [ -z "$before" ]; then
    log_warn "无法获取 Redis LASTSAVE，回退到固定等待 5s"
    sleep 5
    return
  fi

  # 若正在 BGSAVE，redis-cli 会返回提示但不报错；触发一次以确保有新快照
  stack_redis_cli BGSAVE >/dev/null 2>&1 || true

  attempts=0
  while [ "$attempts" -lt 60 ]; do
    after="$(stack_redis_cli LASTSAVE 2>/dev/null | tr -d '[:space:]')"
    if [ -n "$after" ] && [ "$after" -gt "$before" ]; then
      return
    fi
    sleep 1
    attempts=$((attempts + 1))
  done
  log_warn "Redis BGSAVE 在 60s 内未完成，继续使用当前 RDB"
}

backup_database() {
  log_info "备份数据库..."
  mkdir -p "$BACKUP_DIR"

  local ts backup_file tmp_file size
  ts="$(timestamp)"
  backup_file="$BACKUP_DIR/app_backup_${ts}.dump"
  tmp_file="${backup_file}.partial"

  # 任一退出路径都清理半成品（成功 mv 后清除 trap）。
  # 先落 .partial 再改名：cron 与保留策略只会看到完整文件，
  # 备份跑到一半断电也不会留下一个「看着像备份」的残骸。
  trap 'rm -f "$tmp_file"' EXIT

  # 写 stdout 再重定向：容器里的 -f 路径落在容器内，宿主机什么都拿不到
  if ! stack_pg_dump \
      --format=custom \
      --no-owner \
      --no-acl \
      --compress="$DATABASE_BACKUP_COMPRESS" \
      "$DB_NAME" > "$tmp_file"; then
    log_die "pg_dump 失败"
  fi

  # 完整性校验：能列出 TOC 说明 dump 可被 pg_restore 读取
  if ! stack_pg_restore -l < "$tmp_file" >/dev/null 2>&1; then
    log_die "备份文件完整性校验失败: $tmp_file"
  fi

  mv "$tmp_file" "$backup_file"
  trap - EXIT
  chmod 600 "$backup_file"

  size="$(du -h "$backup_file" | cut -f1)"
  log_success "数据库备份完成: $backup_file ($size)"
  OFFSITE_FILES+=("$backup_file")
}

# /data：附件与导出件。本地存储模式（ATTACHMENT_STORAGE=local）下它们只有这一份，
# 数据库备份得再全，丢了这个卷用户的文件就是没了。
backup_data_volume() {
  if [ "$SKIP_DATA" = "1" ]; then
    log_warn "已跳过应用数据卷备份（--skip-data）"
    return
  fi

  local volume
  volume="$(stack_data_volume 2>/dev/null || true)"
  if [ -z "$volume" ]; then
    log_warn "未找到挂在 ${STACK_APP_CONTAINER}:/data 的卷，跳过应用数据备份"
    log_warn "（宿主机直跑应用的老拓扑请手动备份 ATTACHMENT_BASE_DIR / EXPORT_BASE_DIR）"
    return
  fi

  log_info "备份应用数据卷 ($volume)..."
  mkdir -p "$BACKUP_DIR"

  local ts data_file tmp_file size
  ts="$(timestamp)"
  data_file="$BACKUP_DIR/app_data_${ts}.tar.gz"
  tmp_file="${data_file}.partial"
  trap 'rm -f "$tmp_file"' EXIT

  if ! stack_data_tar "$volume" > "$tmp_file"; then
    log_die "应用数据卷打包失败"
  fi
  if ! gzip -t "$tmp_file" 2>/dev/null; then
    log_die "应用数据备份完整性校验失败: $tmp_file"
  fi

  mv "$tmp_file" "$data_file"
  trap - EXIT
  chmod 600 "$data_file"

  size="$(du -h "$data_file" | cut -f1)"
  log_success "应用数据备份完成: $data_file ($size)"
  OFFSITE_FILES+=("$data_file")
}

backup_redis() {
  log_info "备份 Redis 数据..."
  mkdir -p "$BACKUP_DIR"

  if [ "$(stack_redis_mode)" = "none" ]; then
    log_warn "找不到 Redis（容器未运行且宿主机无 redis-cli），跳过 Redis 备份"
    return
  fi
  if ! stack_redis_cli PING >/dev/null 2>&1; then
    log_warn "Redis 不可达，跳过 Redis 备份"
    return
  fi

  local ts backup_file tmp_file
  ts="$(timestamp)"
  backup_file="$BACKUP_DIR/app_redis_backup_${ts}.rdb.gz"
  tmp_file="${backup_file}.partial"

  wait_redis_bgsave

  trap 'rm -f "$tmp_file"' EXIT
  if ! stack_redis_cat_rdb | gzip > "$tmp_file"; then
    log_warn "读取 Redis RDB 失败，跳过 Redis 备份"
    rm -f "$tmp_file"
    trap - EXIT
    return
  fi
  mv "$tmp_file" "$backup_file"
  trap - EXIT
  chmod 600 "$backup_file"

  log_success "Redis 备份完成: $backup_file"
  OFFSITE_FILES+=("$backup_file")
}

# 异地副本。配了 BACKUP_OFFSITE_DEST 却推不上去就是失败——
# 「以为有异地备份」比「知道没有」危险得多。
upload_offsite() {
  if [ -z "$BACKUP_OFFSITE_DEST" ]; then
    log_warn "未设置 BACKUP_OFFSITE_DEST：备份只存在于本机，机器故障即全部丢失"
    return
  fi
  if [ "${#OFFSITE_FILES[@]}" -eq 0 ]; then
    log_warn "没有可上传的备份产物"
    return
  fi

  local tool=""
  case "$BACKUP_OFFSITE_DEST" in
    s3://*)
      command -v aws >/dev/null 2>&1 && tool="aws"
      ;;
  esac
  if [ -z "$tool" ] && command -v rclone >/dev/null 2>&1; then
    tool="rclone"
  fi
  if [ -z "$tool" ]; then
    log_die "BACKUP_OFFSITE_DEST=${BACKUP_OFFSITE_DEST} 已设置，但机器上既没有 aws 也没有 rclone"
  fi

  log_info "上传异地副本 → ${BACKUP_OFFSITE_DEST} (${tool})"
  local f
  for f in "${OFFSITE_FILES[@]}"; do
    case "$tool" in
      aws)
        aws s3 cp "$f" "${BACKUP_OFFSITE_DEST%/}/$(basename "$f")" >/dev/null \
          || log_die "异地上传失败: $f"
        ;;
      rclone)
        rclone copyto "$f" "${BACKUP_OFFSITE_DEST%/}/$(basename "$f")" \
          || log_die "异地上传失败: $f"
        ;;
    esac
    log_info "  已上传 $(basename "$f")"
  done
  log_success "异地副本上传完成"
}

main() {
  OFFSITE_FILES=()
  # 拓扑在 parse_args 里固化（要先知道 --env 才能定容器名）
  parse_args "$@"
  check_privileges

  log_info "开始备份 (目录: $BACKUP_DIR)..."
  backup_database
  backup_data_volume
  backup_redis
  upload_offsite

  log_success "备份完成！"
}

main "$@"
