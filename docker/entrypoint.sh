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

echo "[entrypoint] 执行 prisma migrate deploy..."
cd apps/server
"$PRISMA_BIN" migrate deploy

echo "[entrypoint] 启动 API..."
cd /app
exec "$TSX_BIN" apps/server/dist/index.js
