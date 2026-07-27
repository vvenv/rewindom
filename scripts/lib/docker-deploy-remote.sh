# Docker 远程部署库（宿主机 Nginx 终结 SSL，Docker 栈监听 127.0.0.1:APP_PORT）
# 用法: ROOT=/path/to/repo source scripts/lib/docker-deploy-remote.sh
#       docker_deploy production 0 1   # environment yes bootstrap

if [ -z "${ROOT:-}" ]; then
  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

# shellcheck source=scripts/lib/release-deploy-config.sh
source "$ROOT/scripts/lib/release-deploy-config.sh"
# shellcheck source=scripts/lib/deploy-remote.sh
source "$ROOT/scripts/lib/deploy-remote.sh"
# shellcheck source=scripts/lib/log.sh
source "$ROOT/scripts/lib/log.sh"

docker_default_port_for_env() {
  case "${1:-production}" in
    test) echo "3402" ;;
    *) echo "3400" ;;
  esac
}

docker_remote_dir_for_env() {
  case "${1:-production}" in
    test) echo "/opt/be-water-docker-test" ;;
    *) echo "/opt/be-water-docker" ;;
  esac
}

docker_remote_env_basename_for_env() {
  case "${1:-production}" in
    test) echo ".env.test" ;;
    *) echo ".env.production" ;;
  esac
}

docker_render_host_nginx_proxy() {
  local domain="$1"
  local port="$2"

  cat <<NGINX
# be-water-docker-managed
server {
    listen 80;
    server_name ${domain};

    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
NGINX
}

docker_setup_host_nginx() {
  local domain="$1"
  local port="$2"
  local ssl_email="$3"

  _run_ssh "set -euo pipefail
DOMAIN='${domain}'
PORT='${port}'
SSL_EMAIL='${ssl_email}'
CONF='/etc/nginx/sites-available/${domain}'
ENABLED='/etc/nginx/sites-enabled/${domain}'

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq nginx
  systemctl enable --now nginx
fi

cat > \"\$CONF\" <<'NGINX_EOF'
$(docker_render_host_nginx_proxy "$domain" "$port")
NGINX_EOF

ln -sf \"\$CONF\" \"\$ENABLED\"
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl reload nginx

if [ -n \"\$SSL_EMAIL\" ] && command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d \"\$DOMAIN\" --non-interactive --agree-tos --redirect -m \"\$SSL_EMAIL\" || true
elif [ -n \"\$SSL_EMAIL\" ]; then
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx -d \"\$DOMAIN\" --non-interactive --agree-tos --redirect -m \"\$SSL_EMAIL\" || true
fi
"
}

docker_create_source_tarball() {
  local tarball="$1"
  tar -czf "$tarball" \
    --exclude='./node_modules' \
    --exclude='./apps/server/node_modules' \
    --exclude='./apps/client/node_modules' \
    --exclude='./packages/*/node_modules' \
    --exclude='./.git' \
    --exclude='./release' \
    --exclude='./*.tar.gz' \
    --exclude='./data' \
    --exclude='./backups' \
    -C "$ROOT" \
    docker \
    docker-compose.prod.yml \
    .dockerignore \
    package.json \
    pnpm-lock.yaml \
    pnpm-workspace.yaml \
    apps \
    packages
}

docker_write_remote_env_file() {
  local output="$1"
  local environment="$2"
  local domain="$3"
  local port="$4"

  {
    printf 'DB_PASSWORD=%s\n' "$DB_PASSWORD"
    printf 'JWT_SECRET=%s\n' "$JWT_SECRET"
    printf 'TENANT_SECRET_ENCRYPTION_KEY=%s\n' "$TENANT_SECRET_ENCRYPTION_KEY"
    printf 'APP_DOMAIN=%s\n' "$domain"
    printf 'APP_PORT=%s\n' "$port"
    [ -n "${REDIS_PASSWORD:-}" ] && printf 'REDIS_PASSWORD=%s\n' "$REDIS_PASSWORD"
    [ -n "${OPENAI_API_KEY:-}" ] && printf 'OPENAI_API_KEY=%s\n' "$OPENAI_API_KEY"
    [ -n "${OPENAI_BASE_URL:-}" ] && printf 'OPENAI_BASE_URL=%s\n' "$OPENAI_BASE_URL"
    [ -n "${OPENAI_MODEL:-}" ] && printf 'OPENAI_MODEL=%s\n' "$OPENAI_MODEL"
    [ -n "${PLATFORM_ADMIN_USERNAME:-}" ] && printf 'PLATFORM_ADMIN_USERNAME=%s\n' "$PLATFORM_ADMIN_USERNAME"
    [ -n "${PLATFORM_ADMIN_PASSWORD:-}" ] && printf 'PLATFORM_ADMIN_PASSWORD=%s\n' "$PLATFORM_ADMIN_PASSWORD"
    [ -n "${LOG_LEVEL:-}" ] && printf 'LOG_LEVEL=%s\n' "$LOG_LEVEL"
  } >"$output"
  chmod 600 "$output"
}

docker_remote_compose_up() {
  local remote_dir="$1"
  local env_file="$2"

  _run_ssh "set -euo pipefail
cd '${remote_dir}'

if ! command -v docker >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq docker.io docker-compose-v2
  systemctl enable --now docker
fi

docker compose -f docker-compose.prod.yml --env-file '${env_file}' build --pull
docker compose -f docker-compose.prod.yml --env-file '${env_file}' up -d

echo '--- docker compose ps ---'
docker compose -f docker-compose.prod.yml ps
"
}

docker_wait_for_health() {
  local remote_dir="$1"
  local port="$2"

  _run_ssh "set -euo pipefail
for i in \$(seq 1 60); do
  if curl -fsS \"http://127.0.0.1:${port}/health\" >/dev/null 2>&1; then
    curl -fsS \"http://127.0.0.1:${port}/health\"
    exit 0
  fi
  sleep 5
done
echo '健康检查超时'
docker compose -f '${remote_dir}/docker-compose.prod.yml' logs --tail=80 app web
exit 1
"
}

# docker_deploy environment yes bootstrap [env_only]
# env_only=1: 仅同步 .env 并重启容器，不上传源码
docker_deploy() {
  local environment="${1:-production}"
  local yes="${2:-0}"
  local bootstrap="${3:-0}"
  local env_only="${4:-0}"


  load_deploy_credentials "$environment"

  if [ -z "${DB_PASSWORD:-}" ]; then
    log_die "未配置 DB_PASSWORD（.env.${environment}）"
  fi
  if [ -z "${JWT_SECRET:-}" ]; then
    log_die "未配置 JWT_SECRET（.env.${environment}）"
  fi
  if [ -z "${TENANT_SECRET_ENCRYPTION_KEY:-}" ]; then
    log_die "未配置 TENANT_SECRET_ENCRYPTION_KEY（.env.${environment}）"
  fi

  local domain="${APP_DOMAIN:-}"
  local port="${APP_PORT:-$(docker_default_port_for_env "$environment")}"
  local ssl_email="${SSL_EMAIL:-}"
  local remote_dir
  local remote_env_file
  remote_dir="$(docker_remote_dir_for_env "$environment")"
  remote_env_file="$(docker_remote_env_basename_for_env "$environment")"

  if [ -z "$domain" ]; then
    log_die "未配置 APP_DOMAIN（.env.${environment}）"
  fi

  if [ "$yes" -eq 0 ]; then
    log_info "目标: ${DEPLOY_SSH_USER}@${DEPLOY_HOST} (${environment})"
    log_info "域名: ${domain}"
    log_info "Docker 目录: ${remote_dir}"
    log_info "监听: 127.0.0.1:${port}"
    if [ "$env_only" -eq 1 ]; then
      log_info "模式: 仅同步环境变量"
    elif [ "$bootstrap" -eq 1 ]; then
      log_info "模式: 首次 bootstrap（含 Nginx + SSL）"
    else
      log_info "模式: 更新部署"
    fi
    read -r -p "确认继续? [y/N] " confirm </dev/tty
    [[ "$confirm" =~ ^[Yy]$ ]] || log_die "已取消"
  fi

  _run_ssh "mkdir -p '${remote_dir}'"

  local remote_env
  remote_env="$(mktemp)"
  docker_write_remote_env_file "$remote_env" "$environment" "$domain" "$port"
  _run_scp "$remote_env" "${DEPLOY_SSH_USER}@${DEPLOY_HOST}:${remote_dir}/${remote_env_file}"
  rm -f "$remote_env"

  if [ "$env_only" -eq 0 ]; then
    local tarball staging
    staging="$(mktemp -d)"
    tarball="${staging}/be-water-docker-src.tar.gz"
    docker_create_source_tarball "$tarball"

    log_info "上传源码包到服务器..."
    _run_scp "$tarball" "${DEPLOY_SSH_USER}@${DEPLOY_HOST}:${remote_dir}/be-water-docker-src.tar.gz"
    rm -rf "$staging"

    log_info "在服务器构建并启动 Docker 栈（可能需数分钟）..."
    _run_ssh "set -euo pipefail
cd '${remote_dir}'
tar -xzf be-water-docker-src.tar.gz
rm -f be-water-docker-src.tar.gz
"
    docker_remote_compose_up "$remote_dir" "$remote_env_file"
  else
    log_info "重启 Docker 栈以应用环境变量..."
    _run_ssh "set -euo pipefail
cd '${remote_dir}'
docker compose -f docker-compose.prod.yml --env-file '${remote_env_file}' up -d
"
  fi

  if [ "$bootstrap" -eq 1 ]; then
    log_info "配置宿主机 Nginx + SSL..."
    docker_setup_host_nginx "$domain" "$port" "$ssl_email"
  fi

  log_info "健康检查..."
  docker_wait_for_health "$remote_dir" "$port"

  if [ -n "$ssl_email" ]; then
    log_info "部署完成: https://${domain}"
  else
    log_info "部署完成: http://${domain} (127.0.0.1:${port})"
  fi
}

# 兼容旧调用
docker_bootstrap_production() {
  docker_deploy "${1:-production}" "${2:-0}" 1 0
}
