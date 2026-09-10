#!/bin/bash

# 数据库初始化脚本
# 用法:
#   pnpm seed
#   pnpm seed -- --env test
#   ./scripts/seed.sh --env production

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/log.sh
source "${SCRIPT_DIR}/lib/log.sh"

# 数据库可能跑在容器里（开发是 rewindom-dev-postgres，服务器是 rewindom-postgres）。
# 服务器上 DATABASE_URL 里的主机名 `postgres` 只在 docker 网络内可解析，宿主机上
# 连不通；旧的兜底 `sudo -u postgres psql` 更是找不到服务端——两条路都是断的。
if [ -z "${STACK_PG_CONTAINER:-}" ] \
  && [ "$(docker inspect -f '{{.State.Running}}' rewindom-dev-postgres 2>/dev/null)" = "true" ]; then
    STACK_PG_CONTAINER=rewindom-dev-postgres
    export STACK_PG_CONTAINER
fi
# shellcheck source=lib/stack.sh
source "${SCRIPT_DIR}/lib/stack.sh"

# 解析命令行参数
parse_args() {
    ENVIRONMENT="production"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    # 如果没有指定环境，根据当前目录自动检测
    if [ "$ENVIRONMENT" = "production" ]; then
        CURRENT_DIR=$(pwd)
        if [[ "$CURRENT_DIR" == "/var/www/app_test" ]]; then
            ENVIRONMENT="test"
        fi
    fi

    # 验证环境参数
    if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "test" ]; then
        log_error "无效的环境参数: $ENVIRONMENT (仅支持 production 或 test)"
        exit 1
    fi

    log_info "初始化环境: $ENVIRONMENT"
}

# 加载 DATABASE_URL（本地 .env.local；服务器 .env / .env.production / .env.test）
load_env() {
    local script_dir repo_root env_file
    script_dir=$(cd "$(dirname "$0")" && pwd)
    repo_root="$script_dir/.."

    if [ -f "$repo_root/.env.local" ]; then
        env_file="$repo_root/.env.local"
    elif [ "$ENVIRONMENT" = "test" ] && [ -f "$repo_root/.env.test" ]; then
        env_file="$repo_root/.env.test"
    elif [ -f "$repo_root/.env.production" ]; then
        env_file="$repo_root/.env.production"
    elif [ -f "$repo_root/.env" ]; then
        env_file="$repo_root/.env"
    else
        env_file=""
    fi

    if [ -n "$env_file" ] && [ -f "$env_file" ]; then
        # 仅导出 DATABASE_URL，避免污染环境
        DATABASE_URL=$(grep -E "^DATABASE_URL=" "$env_file" | head -1 | cut -d= -f2-)
        # 去除 Prisma 特有的 schema 查询参数（psql 不识别）
        DATABASE_URL=$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//')
        export DATABASE_URL
    fi
}

# 连接方式只解析一次（每次调用都探测一遍太浪费）。
# 顺序：DATABASE_URL 能真连上 → 容器 → 宿主机 postgres。
# DATABASE_URL 排第一是因为它是应用的真相源；先探一次「真的连得上」再用它，
# 否则服务器上那个只在 docker 网络内可解析的主机名会让整条路径卡死。
PSQL_MODE=""

resolve_psql_mode() {
    if [ -n "$PSQL_MODE" ]; then
        return
    fi
    stack_init
    if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1 \
        && psql "$DATABASE_URL" -tAc 'SELECT 1' >/dev/null 2>&1; then
        PSQL_MODE="url"
    elif [ "$(stack_pg_mode)" = "docker" ]; then
        PSQL_MODE="container"
        log_info "DATABASE_URL 不可直连，改走容器 ${STACK_PG_CONTAINER}"
    elif [ "${EUID:-$(id -u)}" -eq 0 ]; then
        PSQL_MODE="host"
    else
        log_error "连不上数据库：DATABASE_URL 不通，也没有可用的 postgres 容器"
        log_error "（开发机先跑 pnpm db:up；服务器确认 ${STACK_PG_CONTAINER} 在运行）"
        exit 1
    fi
}

psql_exec() {
    resolve_psql_mode
    case "$PSQL_MODE" in
        url)       psql "$DATABASE_URL" "$@" ;;
        container) stack_psql -d "$(stack_pg_db_name "rewindom")" "$@" ;;
        host)
            if [ "$ENVIRONMENT" = "test" ]; then
                DB_NAME="app_test"
            else
                DB_NAME="rewindom"
            fi
            sudo -u postgres psql -d "$DB_NAME" "$@"
            ;;
    esac
}

# 生成 bcrypt 哈希（使用 node）
# 必须在 apps/server 目录运行，因为 bcrypt 安装在该 workspace 包中（pnpm 不做 hoist）
# 通过环境变量传递密码，避免特殊字符引发的注入或解析错误
generate_hash() {
    local password=$1
    local script_dir
    script_dir=$(cd "$(dirname "$0")" && pwd)
    (cd "$script_dir/../apps/server" && SEED_RAW_PASSWORD="$password" node -e "
const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync(process.env.SEED_RAW_PASSWORD, 10));
")
}

# 数据库初始化
seed_database() {
    log_info "开始数据初始化..."

    # 从环境变量读取或使用默认值
    SEED_USERNAME=${SEED_USERNAME:-admin}
    SEED_PASSWORD=${SEED_PASSWORD:-admin123}

    # 检查是否已存在 superuser
    EXISTING_SUPERUSER=$(psql_exec -tAc "SELECT id FROM \"User\" WHERE role='SUPERUSER' LIMIT 1;")

    if [ -n "$EXISTING_SUPERUSER" ]; then
        log_info "Superuser 已存在，跳过初始化"
        return
    fi

    # 生成密码哈希
    log_info "创建默认 superuser..."
    HASHED_PASSWORD=$(generate_hash "$SEED_PASSWORD")

    # 插入用户
    psql_exec -c "
INSERT INTO \"User\" (id, username, password, role, enabled, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '$SEED_USERNAME',
    '$HASHED_PASSWORD',
    'SUPERUSER',
    true,
    NOW(),
    NOW()
);
"

    log_info "Superuser 创建成功: $SEED_USERNAME"
    log_info "默认密码: $SEED_PASSWORD"
    log_warn "请在首次登录后立即修改密码！"
}

# 主函数
main() {
    parse_args "$@"
    log_info "开始数据库初始化..."

    load_env
    seed_database

    log_info "数据初始化完成！"
}

main "$@"
