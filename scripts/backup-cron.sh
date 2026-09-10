#!/bin/bash

# 管理 rewindom 备份定时任务
# 用法:
#   ./scripts/backup-cron.sh install --env production|test
#   ./scripts/backup-cron.sh disable --env production|test
#   ./scripts/backup-cron.sh status

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"

CRON_TAG_PREFIX="rewindom-backup"
APP_OPS_DIR="/etc/rewindom/scripts"
ACTION=""
ENVIRONMENT="production"


usage() {
    sed -n '3,7p' "$0"
    exit 1
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            install|disable|status)
                ACTION="$1"
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
        log_error "无效的环境参数: ${ENVIRONMENT}（仅支持 production 或 test）"
        exit 1
    fi
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 用户运行此脚本"
        exit 1
    fi
}

set_env_vars() {
    if [ "$ENVIRONMENT" = "test" ]; then
        BACKUP_DIR="/backups/test"
        LOCK_FILE="/tmp/app_backup_test.lock"
    else
        BACKUP_DIR="/var/backups/app"
        LOCK_FILE="/tmp/app_backup.lock"
    fi

    CRON_TAG="# ${CRON_TAG_PREFIX}-${ENVIRONMENT}"
    LOG_FILE="/var/log/rewindom-backup-${ENVIRONMENT}.log"
    BACKUP_SCRIPT="${APP_OPS_DIR}/backup.sh"
}

resolve_source_backup_script() {
    local script_dir
    script_dir="$(cd "$(dirname "$0")" && pwd)"
    echo "${script_dir}/backup.sh"
}

sync_backup_script() {
    local source source_lib_dir
    source="$(resolve_source_backup_script)"
    source_lib_dir="$(dirname "$source")/lib"

    if [ ! -f "$source" ]; then
        if [ -f "$BACKUP_SCRIPT" ]; then
            log_warn "未找到 ${source}，保留现有 ${BACKUP_SCRIPT}"
            return 0
        fi
        log_error "备份脚本不存在: $source"
        exit 1
    fi

    mkdir -p "$APP_OPS_DIR/lib"

    # 源与目标可能是**同一个文件**：部署已经把运维脚本同步到 APP_OPS_DIR，
    # 并且就在那里执行本脚本。`install` 对同一文件会直接报错，配上 set -e
    # 整个安装就失败了——表现是「备份定时任务没装上」，而那正是本脚本存在的意义。
    install_if_different() {
        local src="$1" dest="$2"
        [ -f "$src" ] || return 0
        if [ "$src" -ef "$dest" ]; then
            return 0
        fi
        install -m 755 "$src" "$dest"
    }

    install_if_different "$source" "$BACKUP_SCRIPT"
    install_if_different "${source_lib_dir}/log.sh" "${APP_OPS_DIR}/lib/log.sh"
    # backup.sh 依赖的拓扑探测库，漏传则备份直接起不来
    install_if_different "${source_lib_dir}/stack.sh" "${APP_OPS_DIR}/lib/stack.sh"

    if [ "$source" -ef "$BACKUP_SCRIPT" ]; then
        log_info "备份脚本已在 ${APP_OPS_DIR}，无需复制"
    else
        log_info "已同步备份脚本 -> ${BACKUP_SCRIPT}"
    fi
}

ensure_cron_service() {
    if systemctl is-active --quiet cron 2>/dev/null || systemctl is-active --quiet crond 2>/dev/null; then
        return 0
    fi

    log_warn "cron 服务未运行，尝试启动..."
    systemctl start cron 2>/dev/null || systemctl start crond 2>/dev/null || {
        log_error "无法启动 cron 服务，请手动检查: systemctl status cron"
        exit 1
    }
    systemctl enable cron 2>/dev/null || systemctl enable crond 2>/dev/null || true
}

remove_cron_for_env() {
    set_env_vars

    local current filtered
    current=$(crontab -l 2>/dev/null || true)
    if [ -z "$current" ]; then
        return 0
    fi

    filtered=$(printf '%s\n' "$current" | grep -vF "$CRON_TAG" || true)
    filtered=$(printf '%s\n' "$filtered" | grep -vF "$BACKUP_SCRIPT" || true)
    filtered=$(printf '%s\n' "$filtered" | grep -vF "/var/www/app/scripts/backup.sh" || true)
    filtered=$(printf '%s\n' "$filtered" | grep -vF "/var/www/app_test/scripts/backup.sh" || true)

    if [ -n "$filtered" ]; then
        printf '%s\n' "$filtered" | crontab -
    else
        crontab -r 2>/dev/null || true
    fi
}

install_cron() {
    set_env_vars
    sync_backup_script

    if [ ! -f "$BACKUP_SCRIPT" ]; then
        log_error "备份脚本不存在: $BACKUP_SCRIPT"
        exit 1
    fi

    ensure_cron_service
    mkdir -p "$BACKUP_DIR"
    touch "$LOG_FILE"

    remove_cron_for_env

    (crontab -l 2>/dev/null; echo "0 8 * * * flock -n ${LOCK_FILE} bash ${BACKUP_SCRIPT} --env ${ENVIRONMENT} >> ${LOG_FILE} 2>&1 ${CRON_TAG}") | crontab -
    (crontab -l 2>/dev/null; echo "0 9 * * 0 find ${BACKUP_DIR} -name \"app_backup_*.dump\" -mtime +30 -delete ${CRON_TAG}") | crontab -
    (crontab -l 2>/dev/null; echo "0 9 * * 0 find ${BACKUP_DIR} -name \"app_redis_*.rdb.gz\" -mtime +30 -delete ${CRON_TAG}") | crontab -
    # 附件/导出件的备份（backup.sh 的第三类产物）同样要进保留策略，
    # 否则它是唯一一类只增不减的文件，几个月后把备份盘填满
    (crontab -l 2>/dev/null; echo "0 9 * * 0 find ${BACKUP_DIR} -name \"app_data_*.tar.gz\" -mtime +30 -delete ${CRON_TAG}") | crontab -
    # 中断留下的半成品（*.partial）不该攒着
    (crontab -l 2>/dev/null; echo "0 9 * * 0 find ${BACKUP_DIR} -name \"*.partial\" -mtime +1 -delete ${CRON_TAG}") | crontab -

    log_info "已安装 $ENVIRONMENT 环境备份定时任务"
    log_info "备份脚本: $BACKUP_SCRIPT"
    log_info "备份日志: $LOG_FILE"
    log_info "手动测试: bash $BACKUP_SCRIPT --env $ENVIRONMENT"
}

disable_cron() {
    remove_cron_for_env
    log_info "已禁用 $ENVIRONMENT 环境备份定时任务"
}

show_status() {
    local current matches
    current=$(crontab -l 2>/dev/null || true)

    if [ -z "$current" ]; then
        log_warn "当前用户没有 crontab 条目"
        exit 0
    fi

    matches=$(printf '%s\n' "$current" | grep -F "$CRON_TAG_PREFIX" || true)
    if [ -z "$matches" ]; then
        log_warn "未找到 rewindom 备份定时任务"
        exit 0
    fi

    log_info "当前 rewindom 备份定时任务:"
    printf '%s\n' "$matches"
}

main() {
    parse_args "$@"

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
