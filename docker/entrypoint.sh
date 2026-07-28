#!/bin/sh
set -eu

cd /app

PRISMA_BIN="/app/node_modules/.pnpm/node_modules/.bin/prisma"
TSX_BIN="/app/node_modules/.pnpm/node_modules/.bin/tsx"

db_host="${DATABASE_HOST:-postgres}"
db_port="${DATABASE_PORT:-5432}"
db_user="${DATABASE_USER:-be-water}"

echo "[entrypoint] 等待 PostgreSQL (${db_host}:${db_port})..."
for i in $(seq 1 60); do
  if pg_isready -h "$db_host" -p "$db_port" -U "$db_user" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "[entrypoint] PostgreSQL 未就绪，退出"
    exit 1
  fi
  sleep 2
done

# 迁移历史已收敛为单条 init（见 merge-migrations skill）。
# 对**已有 schema 但迁移历史里没有这条 init** 的库（收敛前就存在的老库），
# 直接 `migrate deploy` 会重新执行建表 SQL 并以 "already exists" 失败，
# 必须先 baseline。全新空库则跳过这一步，让 deploy 正常建表。
INIT_MIGRATION="$(ls -1 /app/apps/server/prisma/migrations | grep -E '_init$' | head -1)"
if [ -n "$INIT_MIGRATION" ]; then
  has_tables="$(psql "$DATABASE_URL" -Atc \
    "SELECT to_regclass('public.\"User\"') IS NOT NULL;" 2>/dev/null || echo f)"
  has_record="$(psql "$DATABASE_URL" -Atc \
    "SELECT EXISTS(SELECT 1 FROM _prisma_migrations WHERE migration_name = '${INIT_MIGRATION}' AND finished_at IS NOT NULL);" 2>/dev/null || echo f)"
  if [ "$has_tables" = "t" ] && [ "$has_record" != "t" ]; then
    echo "[entrypoint] 检测到已有 schema 但缺少 ${INIT_MIGRATION} 记录，执行 baseline..."
    cd apps/server
    psql "$DATABASE_URL" -q -c 'DELETE FROM "_prisma_migrations";' 2>/dev/null || true
    "$PRISMA_BIN" migrate resolve --applied "$INIT_MIGRATION"
    cd /app
  fi
fi

echo "[entrypoint] 执行 prisma migrate deploy..."
cd apps/server
"$PRISMA_BIN" migrate deploy

echo "[entrypoint] 启动 API..."
cd /app
exec "$TSX_BIN" apps/server/dist/index.js
