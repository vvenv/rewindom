#!/bin/bash
# 在生产 Docker 网络里跑 seed-local-marketing-site.ts。
# 生产 app 镜像是精简产物：没有 tsx、也没有 scripts/，不能 compose exec 直接跑。
set -euo pipefail

REMOTE_DIR="${1:-/opt/rewindom-docker}"
cd "$REMOTE_DIR"

docker exec rewindom-app env > /tmp/rewindom-app.env

docker run --rm \
  --network rewindom-docker_default \
  --env-file /tmp/rewindom-app.env \
  -e npm_config_update_notifier=false \
  -v "${REMOTE_DIR}:/workspace" \
  -w /workspace \
  --entrypoint bash \
  node:22-bookworm-slim \
  -lc 'set -euo pipefail
apt-get update -qq
apt-get install -y -qq --no-install-recommends git ca-certificates openssl python3 make g++ >/dev/null
corepack enable
corepack prepare pnpm@11.22.0 --activate
pnpm install --frozen-lockfile
pnpm --filter server exec prisma generate
pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts rewindom
'

rm -f /tmp/rewindom-app.env
