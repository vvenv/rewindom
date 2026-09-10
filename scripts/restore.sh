#!/bin/bash
# 数据库还原脚本（在服务器上以 root 运行）
# 从 backup.sh 产物还原 PostgreSQL + Redis，与备份对称。
#
# 用法:
#   ./scripts/restore.sh --env production --list                 # 列出可用备份
#   ./scripts/restore.sh --env production --latest               # 还原最新 PG 备份
#   ./scripts/restore.sh --env production --file <path>          # 还原指定 PG 备份
#   ./scripts/restore.sh --env production --file <pg.dump> --redis-file <rdb.gz>
#   ./scripts/restore.sh --env production --latest --only-pg     # 仅还原 PG
#   ./scripts/restore.sh --env production --redis-file <rdb.gz> --only-redis
#   ./scripts/restore.sh --env production --latest --yes         # 跳过确认（自动化/远程编排）
#   ./scripts/restore.sh --env production --latest --no-safety-backup
#   ./scripts/restore.sh --env production --data-file <app_data.tar.gz>   # 附件/导出件
#   ./scripts/restore.sh --env production --latest --only-data
#
# 行为:
#   - 默认在还原前自动做一次「安全备份」(app_backup_safety_<ts>.dump)，作为回滚兜底。
#   - PG 还原：终止连接 → DROP/CREATE DATABASE（WITH FORCE）→ pg_restore → 把对象 re-own 给 rewindom。
#     （不用 --clean，避免扩展/依赖顺序冲突；清库重建最干净。）
#   - Redis 还原：停服 → 用备份 RDB 替换 dump.rdb → 启服。
#   - /data 还原：清空应用数据卷再解包（附件与导出件）。**会先停 app 容器**，
#     否则正在写入的进程会和解包互相踩。
#   - 破坏性操作前要求交互确认（输入大写 YES），非交互终端需 --yes。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"
# shellcheck source=lib/stack.sh
source "${SCRIPT_DIR}/lib/stack.sh"

ENVIRONMENT="production"
PG_FILE=""
REDIS_FILE=""
DATA_FILE=""
ONLY_DATA=0
USE_LATEST=0
ONLY_PG=0
ONLY_REDIS=0
ASSUME_YES=0
NO_SAFETY_BACKUP=0
LIST_ONLY=0

# 应用 DB 用户恒为 rewindom（与 bootstrap-ci.sh 一致），库按环境区分
DB_USER="rewindom"

usage() {
  sed -n '3,21p' "$0"
  exit 0
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --env)            ENVIRONMENT="$2"; shift 2 ;;
      --file)           PG_FILE="$2"; shift 2 ;;
      --redis-file)     REDIS_FILE="$2"; shift 2 ;;
      --data-file)      DATA_FILE="$2"; shift 2 ;;
      --only-data)      ONLY_DATA=1; shift ;;
      --latest)         USE_LATEST=1; shift ;;
      --only-pg)        ONLY_PG=1; shift ;;
      --only-redis)     ONLY_REDIS=1; shift ;;
      --yes)            ASSUME_YES=1; shift ;;
      --no-safety-backup) NO_SAFETY_BACKUP=1; shift ;;
      --list)           LIST_ONLY=1; shift ;;
      --help|-h)        usage ;;
      *)                log_die "未知参数: $1" ;;
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

  # 与 backup.sh 同源：库名以运行中的容器为准，不按 --env 硬映射
  DB_NAME="$(stack_pg_db_name "$DB_FALLBACK")"
  DB_USER="$(stack_pg_user "rewindom")"

  local only_count=$((ONLY_PG + ONLY_REDIS + ONLY_DATA))
  if [ "$only_count" -gt 1 ]; then
    log_die "--only-pg / --only-redis / --only-data 三者互斥"
  fi
}

# 与 backup.sh 一致：容器拓扑只需要 docker 权限，宿主机拓扑才必须 root
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

# 解析 PG 备份文件路径：--file 优先；否则 --latest 取最新（优先非 safety）
# 文件名含时间戳 YYYYMMDD_HHMMSS，bash glob 按名字升序展开即按时间升序，
# 迭代到最后一个即为最新。
resolve_pg_file() {
  if [ -n "$PG_FILE" ]; then
    [ -f "$PG_FILE" ] || log_die "备份文件不存在: $PG_FILE"
    return
  fi

  if [ "$USE_LATEST" != "1" ]; then
    return  # 仅 Redis 还原时不需要 PG 文件
  fi

  local f latest=""
  for f in "$BACKUP_DIR"/app_backup_*.dump; do
    [ -e "$f" ] || continue
    case "$(basename "$f")" in *safety*) continue ;; esac
    latest="$f"  # 不断覆盖，最终保留字典序最后（最新）的一个
  done
  if [ -z "$latest" ]; then
    for f in "$BACKUP_DIR"/app_backup_*.dump; do
      [ -e "$f" ] || continue
      latest="$f"
    done
  fi
  [ -n "$latest" ] || log_die "未找到 PG 备份文件 ($BACKUP_DIR/app_backup_*.dump)"
  PG_FILE="$latest"
}

# 解析应用数据备份路径（--data-file 优先；--only-data --latest 时取最新）
resolve_data_file() {
  if [ -n "$DATA_FILE" ]; then
    [ -f "$DATA_FILE" ] || log_die "应用数据备份不存在: $DATA_FILE"
    return
  fi
  if [ "$ONLY_DATA" != "1" ] || [ "$USE_LATEST" != "1" ]; then
    return
  fi

  local f latest=""
  for f in "$BACKUP_DIR"/app_data_*.tar.gz; do
    [ -e "$f" ] || continue
    latest="$f"
  done
  [ -n "$latest" ] || log_die "未找到应用数据备份 ($BACKUP_DIR/app_data_*.tar.gz)"
  DATA_FILE="$latest"
}

# 倒序打印一组文件（最新在前）
_print_files_desc() {
  local label="$1"; shift
  local -a arr=("$@")
  log_info "${label} ($BACKUP_DIR):"
  if [ "${#arr[@]}" -gt 0 ]; then
    local i
    for ((i = ${#arr[@]} - 1; i >= 0; i--)); do
      printf '  %s  %s\n' \
        "$(date -r "${arr[$i]}" '+%Y-%m-%d %H:%M' 2>/dev/null || echo '?')" \
        "$(basename "${arr[$i]}")"
    done
  else
    echo "  （无）"
  fi
}

list_backups() {
  local f
  local -a pgs=() redises=() datas=()
  for f in "$BACKUP_DIR"/app_backup_*.dump; do
    [ -e "$f" ] || continue
    pgs+=("$f")
  done
  for f in "$BACKUP_DIR"/app_data_*.tar.gz; do
    [ -e "$f" ] || continue
    datas+=("$f")
  done
  for f in "$BACKUP_DIR"/app_redis_*.rdb.gz; do
    [ -e "$f" ] || continue
    redises+=("$f")
  done

  _print_files_desc "PostgreSQL 备份" "${pgs[@]}"
  echo
  _print_files_desc "应用数据备份 (/data)" "${datas[@]}"
  echo
  _print_files_desc "Redis 备份" "${redises[@]}"
}

confirm_restore() {
  if [ "$ASSUME_YES" = "1" ]; then
    return 0
  fi
  if [ ! -t 0 ]; then
    log_die "非交互终端，需加 --yes 确认还原"
  fi
  echo
  log_warn "即将还原：数据库 [$DB_NAME] / Redis / 应用数据卷（按所选范围），当前数据将被覆盖！"
  read -r -p "确认还原？输入大写 YES 继续: " reply
  if [ "$reply" != "YES" ]; then
    log_die "已取消"
  fi
}

# 还原前安全备份（仅当要还原 PG 时）
pre_restore_safety_backup() {
  if [ "$NO_SAFETY_BACKUP" = "1" ]; then
    log_warn "已跳过还原前安全备份（--no-safety-backup）"
    return
  fi
  mkdir -p "$BACKUP_DIR"

  local timestamp safety_file tmp_file
  timestamp="$(date +%Y%m%d_%H%M%S)"
  safety_file="$BACKUP_DIR/app_backup_safety_${timestamp}.dump"
  tmp_file="${safety_file}.partial"
  trap 'rm -f "$tmp_file"' EXIT

  log_info "生成还原前安全备份..."
  if ! stack_pg_dump --format=custom --no-owner --no-acl "$DB_NAME" > "$tmp_file" 2>/dev/null; then
    rm -f "$tmp_file"
    trap - EXIT
    log_warn "安全备份失败（数据库可能为空或不可达），继续还原"
    return
  fi
  mv "$tmp_file" "$safety_file"
  trap - EXIT
  chmod 600 "$safety_file"
  log_success "安全备份完成: $safety_file"
}

restore_pg() {
  if [ -z "$PG_FILE" ]; then
    return
  fi
  log_info "还原 PostgreSQL: $PG_FILE → $DB_NAME"

  # 完整性校验
  if ! stack_pg_restore -l < "$PG_FILE" >/dev/null 2>&1; then
    log_die "备份文件不可读或损坏: $PG_FILE"
  fi

  log_warn "建议在还原前停止应用容器（docker stop ${STACK_APP_CONTAINER}），否则连接被强制断开会产生 5xx 直到还原完成"
  log_info "终止到 $DB_NAME 的现有连接..."
  stack_psql -d postgres -tAc \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true

  # DROP DATABASE WITH (FORCE)（PG13+）一并终止残留连接；CREATE 后为空库，避免扩展依赖冲突
  log_info "重建数据库 $DB_NAME..."
  stack_psql -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE);"
  stack_psql -d postgres -c "CREATE DATABASE \"$DB_NAME\";"

  log_info "pg_restore 载入..."
  if ! stack_pg_restore \
      --no-owner \
      --no-acl \
      --exit-on-error \
      --dbname="$DB_NAME" < "$PG_FILE"; then
    log_die "pg_restore 失败（安全备份见 $BACKUP_DIR/app_backup_safety_*.dump）"
  fi

  log_info "把对象所有权归还给 ${DB_USER}（Prisma migration 需要）..."
  # 库级归属（连到维护库 postgres 执行）
  stack_psql -d postgres \
    -c "ALTER DATABASE \"$DB_NAME\" OWNER TO \"$DB_USER\";" \
    -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";"
  # schema 归属 + 默认权限（连到目标库执行）
  stack_psql -d "$DB_NAME" \
    -c "ALTER SCHEMA public OWNER TO \"$DB_USER\";" \
    -c "GRANT ALL ON SCHEMA public TO \"$DB_USER\";" \
    -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"$DB_USER\";" \
    -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO \"$DB_USER\";"
  # 把 public 下已还原的表/视图/序列 re-own 给应用用户
  # （生成 ALTER 语句再执行；不在 DO block 内用 psql 变量——psql 不在 dollar-quote 内做变量替换）
  stack_psql -d "$DB_NAME" -tAc \
    "SELECT 'ALTER ' || CASE WHEN relkind='S' THEN 'SEQUENCE' ELSE 'TABLE' END \
       || ' public.' || quote_ident(relname) \
       || ' OWNER TO ' || quote_ident('$DB_USER') || ';' \
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace \
     WHERE n.nspname='public' AND relkind IN ('r','p','v','m','f','S');" \
    | stack_psql -d "$DB_NAME"

  log_success "PostgreSQL 还原完成"
}

restore_redis() {
  if [ -z "$REDIS_FILE" ]; then
    return
  fi
  [ -f "$REDIS_FILE" ] || log_die "Redis 备份文件不存在: $REDIS_FILE"
  log_info "还原 Redis: $REDIS_FILE"

  if [ "$(stack_redis_mode)" = "none" ]; then
    log_die "找不到 Redis（容器未运行且宿主机无 redis-cli）"
  fi

  # 路径必须在停服之前问：停了就没人回答 CONFIG GET
  local rdb tmp
  rdb="$(stack_redis_rdb_path)" || log_die "无法获取 Redis dir/dbfilename 配置"

  log_info "停止 Redis..."
  stack_redis_stop

  tmp="$(mktemp)"
  # shellcheck disable=SC2064
  trap "rm -f '$tmp'" EXIT
  gunzip -c "$REDIS_FILE" > "$tmp"
  stack_redis_write_rdb "$tmp" "$rdb" || log_die "写入 RDB 失败: $rdb"
  rm -f "$tmp"
  trap - EXIT

  log_info "启动 Redis..."
  stack_redis_start
  sleep 1
  if ! stack_redis_cli PING >/dev/null 2>&1; then
    log_die "Redis 启动后 PING 失败"
  fi
  log_success "Redis 还原完成"
}

# /data：附件与导出件。清空重解包，与 backup.sh 的 app_data_*.tar.gz 对称。
restore_data() {
  if [ -z "$DATA_FILE" ]; then
    return
  fi
  [ -f "$DATA_FILE" ] || log_die "应用数据备份不存在: $DATA_FILE"
  if ! gzip -t "$DATA_FILE" 2>/dev/null; then
    log_die "应用数据备份损坏: $DATA_FILE"
  fi

  local volume app_was_running=0
  volume="$(stack_data_volume 2>/dev/null || true)"
  if [ -z "$volume" ]; then
    log_die "未找到挂在 ${STACK_APP_CONTAINER}:/data 的卷，无法还原应用数据"
  fi

  log_info "还原应用数据: $DATA_FILE → 卷 $volume"

  # 边解包边被应用写入必然出乱子；停掉再还原，结束后按原状态恢复。
  if [ "$(docker inspect -f '{{.State.Running}}' "$STACK_APP_CONTAINER" 2>/dev/null)" = "true" ]; then
    app_was_running=1
    log_info "停止应用容器 ${STACK_APP_CONTAINER}..."
    docker stop "$STACK_APP_CONTAINER" >/dev/null
  fi

  if ! stack_data_untar "$volume" < "$DATA_FILE"; then
    log_error "应用数据解包失败"
    [ "$app_was_running" = "1" ] && docker start "$STACK_APP_CONTAINER" >/dev/null
    log_die "还原中止"
  fi

  if [ "$app_was_running" = "1" ]; then
    log_info "启动应用容器 ${STACK_APP_CONTAINER}..."
    docker start "$STACK_APP_CONTAINER" >/dev/null
  fi
  log_success "应用数据还原完成"
}

main() {
  # 拓扑在 parse_args 里固化（要先知道 --env 才能定容器名），
  # 之后不再重新探测——还原 Redis 会 docker stop，中途重探会把模式翻成 host
  parse_args "$@"
  check_privileges

  if [ "$LIST_ONLY" = "1" ]; then
    list_backups
    exit 0
  fi

  # 决定还原范围
  if [ "$ONLY_REDIS" != "1" ] && [ "$ONLY_DATA" != "1" ]; then
    resolve_pg_file
  fi
  resolve_data_file
  if [ "$ONLY_PG" = "1" ]; then
    REDIS_FILE=""
    DATA_FILE=""
  fi
  if [ "$ONLY_REDIS" = "1" ]; then
    DATA_FILE=""
  fi
  if [ "$ONLY_DATA" = "1" ]; then
    REDIS_FILE=""
  fi

  if [ -z "$PG_FILE" ] && [ -z "$REDIS_FILE" ] && [ -z "$DATA_FILE" ]; then
    log_die "未指定要还原的内容：--file/--latest 还原 PG，--redis-file 还原 Redis，--data-file 还原 /data"
  fi

  log_info "还原环境: $ENVIRONMENT | 数据库: $DB_NAME | 拓扑: $(stack_pg_mode)"
  [ -n "$PG_FILE" ] && log_info "PG 备份: $PG_FILE"
  [ -n "$DATA_FILE" ] && log_info "应用数据备份: $DATA_FILE"
  [ -n "$REDIS_FILE" ] && log_info "Redis 备份: $REDIS_FILE"

  confirm_restore

  # 仅在还原 PG 时做安全备份（Redis / /data 还原不触发）
  if [ -n "$PG_FILE" ]; then
    pre_restore_safety_backup
    restore_pg
  fi
  if [ -n "$DATA_FILE" ]; then
    restore_data
  fi
  if [ -n "$REDIS_FILE" ]; then
    restore_redis
  fi

  log_success "还原完成！"
}

main "$@"
