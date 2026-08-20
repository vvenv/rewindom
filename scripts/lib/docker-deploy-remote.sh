# Docker 远程部署库（宿主机 Nginx 终结 SSL，Docker 栈监听 127.0.0.1:APP_PORT）
# 用法: ROOT=/path/to/repo source scripts/lib/docker-deploy-remote.sh
#       docker_deploy production 0 1   # environment yes bootstrap

if [ -z "${ROOT:-}" ]; then
  _docker_deploy_src="${BASH_SOURCE[0]:-$0}"
  ROOT="$(cd "$(dirname "$_docker_deploy_src")/../.." && pwd)"
  unset _docker_deploy_src
fi

# shellcheck source=scripts/lib/release-deploy-config.sh
source "$ROOT/scripts/lib/release-deploy-config.sh"
# shellcheck source=scripts/lib/deploy-remote.sh
source "$ROOT/scripts/lib/deploy-remote.sh"
# shellcheck source=scripts/lib/log.sh
source "$ROOT/scripts/lib/log.sh"

docker_default_port_for_env() {
  case "${1:-production}" in
    test) echo "3702" ;;
    *) echo "3700" ;;
  esac
}

docker_remote_dir_for_env() {
  case "${1:-production}" in
    test) echo "/opt/rewindom-docker-test" ;;
    *) echo "/opt/rewindom-docker" ;;
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
# rewindom-docker-managed
server {
    listen 80 default_server;
    # 平台主域 + 通配子域；default_server 让 custom_domain 在扩证前也能打到应用。
    # 证书需含 *.${domain}；客户自有域另签 / 扩证（见 docs/custom-domain.md）。
    server_name ${domain} *.${domain};

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
  # 平台控制台默认 Host；与 compose PLATFORM_HOST 默认一致
  local platform_host="${PLATFORM_HOST:-admin.${domain}}"

  _run_ssh "set -euo pipefail
DOMAIN='${domain}'
PLATFORM_HOST='${platform_host}'
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

# 证书必须覆盖产品主域 + 平台控制台 Host；只签主域时访问 admin.* 会证书不匹配 / 落到错误 server。
if [ -n \"\$SSL_EMAIL\" ] && command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d \"\$DOMAIN\" -d \"\$PLATFORM_HOST\" --non-interactive --agree-tos --redirect -m \"\$SSL_EMAIL\" || true
elif [ -n \"\$SSL_EMAIL\" ]; then
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx -d \"\$DOMAIN\" -d \"\$PLATFORM_HOST\" --non-interactive --agree-tos --redirect -m \"\$SSL_EMAIL\" || true
fi
"
}

# HTTP/2 —— 每次部署都跑一遍，幂等。
#
# 为什么不能写进 `docker_render_host_nginx_proxy`：那份模板只渲染 `listen 80`，
# **443 那行是 certbot 写的**（`certbot --nginx` 接管 server 块并加上
# `listen 443 ssl;`）。certbot 从不加 http2，于是 TLS 站点一直停在 HTTP/1.1
# ——线上抓过，`curl --http2` 谈下来的仍是 1.1。
#
# 每次部署都跑而不是只在 bootstrap：新签一个自定义域会让 certbot 再改一次
# nginx 配置，那条新的 443 listen 同样没有 http2。跑一遍把它们都补上。
#
# nginx 1.25.1 起 `listen ... http2` 被 `http2 on;` 取代（旧写法仍然生效，
# 只是 `nginx -t` 会提示 deprecated）。这里统一用 listen 参数：一条 sed 覆盖所有版本，
# 而它在 1.24（当前生产版本）上是**唯一**的写法。
docker_enable_host_nginx_http2() {
  log_info "确认宿主机 Nginx 已开启 HTTP/2..."
  _run_ssh 'set -euo pipefail
command -v nginx >/dev/null 2>&1 || exit 0

changed=""
for link in /etc/nginx/sites-enabled/*; do
  [ -e "$link" ] || continue
  conf="$(readlink -f "$link")"
  # 只动本仓库管的 vhost（部署模板 / ACME helper 写的那两种）
  grep -q "^# rewindom-" "$conf" || continue
  grep -qE "listen (\[::\]:)?443 ssl;" "$conf" || continue
  cp -a "$conf" "$conf.pre-http2.bak"
  sed -i -e "s/listen 443 ssl;/listen 443 ssl http2;/" \
         -e "s/listen \[::\]:443 ssl;/listen [::]:443 ssl http2;/" "$conf"
  changed="$changed $conf"
done

[ -n "$changed" ] || exit 0

if nginx -t; then
  systemctl reload nginx
  for conf in $changed; do rm -f "$conf.pre-http2.bak"; done
  echo "[http2] enabled on:$changed"
else
  for conf in $changed; do mv -f "$conf.pre-http2.bak" "$conf"; done
  echo "[http2] nginx -t failed, rolled back" >&2
  exit 1
fi
'
}

# HSTS —— 每次部署都跑一遍，幂等。
#
# 与 HTTP/2 同一条理由：443 server 块是 certbot 写的，模板里的 listen 80 加不进去。
# Semrush 抓首页会记「No HSTS support」。max-age 一年 + includeSubDomains，覆盖 www。
#
# 必须吃掉 listen 行到行尾（含 `http2;`）。`s//&\n add_header/` 只匹配到 `ssl`，
# 会把分号留在下一行——nginx 指令直到 `;` 才结束，于是 `add_header` 变成
# `listen` 的参数：invalid parameter "add_header"。
docker_enable_host_nginx_hsts() {
  log_info "确认宿主机 Nginx 已开启 HSTS..."
  _run_ssh 'set -euo pipefail
command -v nginx >/dev/null 2>&1 || exit 0

changed=""
for link in /etc/nginx/sites-enabled/*; do
  [ -e "$link" ] || continue
  conf="$(readlink -f "$link")"
  grep -q "^# rewindom-" "$conf" || continue
  grep -qE "listen (\[::\]:)?443 ssl" "$conf" || continue
  grep -q Strict-Transport-Security "$conf" && continue
  cp -a "$conf" "$conf.pre-hsts.bak"
  sed -i "0,/listen .*443 ssl/s/listen .*443 ssl.*/&\n    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;/" "$conf"
  changed="$changed $conf"
done

[ -n "$changed" ] || exit 0

if nginx -t; then
  systemctl reload nginx
  for conf in $changed; do rm -f "$conf.pre-hsts.bak"; done
  echo "[hsts] enabled on:$changed"
else
  for conf in $changed; do mv -f "$conf.pre-hsts.bak" "$conf"; done
  echo "[hsts] nginx -t failed, rolled back" >&2
  exit 1
fi
'
}

docker_ensure_acme_helper() {
  local domain="$1"
  local port="$2"
  local ssl_email="$3"
  local token="${ACME_HELPER_TOKEN:-}"

  if [ -z "$token" ]; then
    log_warn "未配置 ACME_HELPER_TOKEN，跳过 ACME helper（平台「签发证书」不可用）"
    return 0
  fi

  log_info "安装宿主机 ACME helper..."
  _run_ssh "mkdir -p /opt/rewindom-acme /etc/rewindom"
  _run_scp "$ROOT/scripts/acme-helper.py" \
    "${DEPLOY_SSH_USER}@${DEPLOY_HOST}:/opt/rewindom-acme/acme-helper.py"
  _run_ssh "set -euo pipefail
chmod 755 /opt/rewindom-acme/acme-helper.py
cat > /etc/rewindom/acme-helper.env <<EOF
ACME_HELPER_TOKEN=${token}
ACME_HELPER_PORT=9370
APP_PORT=${port}
APP_DOMAIN=${domain}
SSL_EMAIL=${ssl_email}
EOF
chmod 600 /etc/rewindom/acme-helper.env
cat > /etc/systemd/system/rewindom-acme-helper.service <<'UNIT'
[Unit]
Description=rewindom ACME helper (localhost)
After=network.target nginx.service

[Service]
Type=simple
EnvironmentFile=/etc/rewindom/acme-helper.env
ExecStart=/usr/bin/python3 /opt/rewindom-acme/acme-helper.py
Restart=on-failure
User=root

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now rewindom-acme-helper
systemctl restart rewindom-acme-helper
"
}

docker_create_source_tarball() {
  local tarball="$1"
  # COPYFILE_DISABLE：macOS 下禁止把 AppleDouble（._*）打进包，否则 Prisma 会把 ._*.prisma 当 schema 解析失败
  # dist 在镜像里重建，不要把本机 vite/esbuild 产物打进去
  COPYFILE_DISABLE=1 tar -czf "$tarball" \
    --exclude='./node_modules' \
    --exclude='./apps/server/node_modules' \
    --exclude='./apps/client/node_modules' \
    --exclude='./packages/*/node_modules' \
    --exclude='./modules/*/node_modules' \
    --exclude='./apps/server/dist' \
    --exclude='./apps/client/dist' \
    --exclude='./.git' \
    --exclude='./release' \
    --exclude='./*.tar.gz' \
    --exclude='./data' \
    --exclude='./backups' \
    --exclude='*/._*' \
    --exclude='._*' \
    --exclude='*/.DS_Store' \
    --exclude='.DS_Store' \
    -C "$ROOT" \
    docker \
    docker-compose.prod.yml \
    .dockerignore \
    package.json \
    pnpm-lock.yaml \
    pnpm-workspace.yaml \
    apps \
    packages \
    modules
}

docker_write_remote_env_file() {
  local output="$1"
  local environment="$2"
  local domain="$3"
  local port="$4"
  local source_env
  source_env="$(deploy_env_file_for "$ROOT" "$environment")"

  deploy_env_write_runtime_file "$source_env" "$output"
  {
    printf 'APP_DOMAIN=%s\n' "$domain"
    printf 'APP_PORT=%s\n' "$port"
    printf 'DB_PASSWORD=%s\n' "$DB_PASSWORD"
  } >>"$output"
  chmod 600 "$output"
}

docker_remote_compose_up() {
  local remote_dir="$1"
  local env_file="$2"
  local pull_base="${3:-0}"
  local build_cmd="docker compose -f docker-compose.prod.yml --env-file '${env_file}' build"
  if [ "$pull_base" = "1" ]; then
    build_cmd="${build_cmd} --pull"
  fi

  # 构建与 up 在独立 session 里跑，日志落到文件。SSH 只负责 tail：
  # 客户端断线不会 SIGHUP 构建，也不会把 compose 卡在已死的 pty 上。
  _run_ssh "set -euo pipefail
cd '${remote_dir}'

if ! command -v docker >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq docker.io docker-compose-v2
  systemctl enable --now docker
fi

log=/tmp/rewindom-docker-compose.log
rcfile=/tmp/rewindom-docker-compose.rc
job=/tmp/rewindom-docker-compose-job.sh
rm -f \"\$rcfile\"
: > \"\$log\"
cat > \"\$job\" <<'JOB'
#!/bin/bash
set +e
cd '${remote_dir}'
${build_cmd}
b=\$?
if [ \"\$b\" -eq 0 ]; then
  docker compose -f docker-compose.prod.yml --env-file '${env_file}' up -d
  b=\$?
fi
echo \$b > /tmp/rewindom-docker-compose.rc
JOB
chmod +x \"\$job\"
setsid nohup \"\$job\" >>\"\$log\" 2>&1 < /dev/null &
echo \"compose 已在后台启动，日志 \$log\"
while [ ! -f \"\$rcfile\" ]; do
  sleep 8
  tail -n 5 \"\$log\" || true
  echo
done
tail -n 40 \"\$log\"
rc=\$(cat \"\$rcfile\")
echo '--- docker compose ps ---'
docker compose -f docker-compose.prod.yml --env-file '${env_file}' ps
exit \"\$rc\"
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

# docker_deploy environment yes bootstrap [env_only] [pull_base]
# env_only=1: 仅同步 .env 并重启容器，不上传源码
# pull_base=1: docker compose build --pull（刷新 base image；日常默认关）
docker_deploy() {
  local environment="${1:-production}"
  local yes="${2:-0}"
  local bootstrap="${3:-0}"
  local env_only="${4:-0}"
  local pull_base="${5:-0}"


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
    if [ "$pull_base" -eq 1 ]; then
      log_info "base image: build --pull"
    else
      log_info "base image: 复用本地缓存（加 --pull-base 可强制刷新）"
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
    tarball="${staging}/rewindom-docker-src.tar.gz"
    docker_create_source_tarball "$tarball"

    log_info "上传源码包到服务器..."
    _run_scp "$tarball" "${DEPLOY_SSH_USER}@${DEPLOY_HOST}:${remote_dir}/rewindom-docker-src.tar.gz"
    rm -rf "$staging"

    log_info "在服务器构建并启动 Docker 栈（可能需数分钟）..."
    # tar 解压不会删除目标机上已移除的文件（如 squash 掉的旧 migration），
    # 先清掉会被覆盖的源码树，避免 Docker COPY 打进陈旧 migration 导致 deploy 失败。
    _run_ssh "set -euo pipefail
cd '${remote_dir}'
rm -rf apps packages modules docker
rm -f docker-compose.prod.yml .dockerignore package.json pnpm-lock.yaml pnpm-workspace.yaml
tar -xzf rewindom-docker-src.tar.gz
rm -f rewindom-docker-src.tar.gz
"
    docker_remote_compose_up "$remote_dir" "$remote_env_file" "$pull_base"
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

  docker_ensure_acme_helper "$domain" "$port" "$ssl_email"
  docker_enable_host_nginx_http2
  docker_enable_host_nginx_hsts

  log_info "健康检查..."
  docker_wait_for_health "$remote_dir" "$port"

  if [ -n "$ssl_email" ]; then
    log_info "部署完成: https://${domain}"
  else
    log_info "部署完成: http://${domain} (127.0.0.1:${port})"
  fi
}

# docker_remote_logs environment [options...]
# options: --tail N | --follow | --service NAME... | --grep PATTERN
docker_remote_logs() {
  local environment="${1:-production}"
  shift || true

  local tail_lines=200
  local follow=0
  local grep_pattern=""
  local -a services=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tail)
        tail_lines="$2"
        shift 2
        ;;
      --follow|-f)
        follow=1
        shift
        ;;
      --service|-s)
        services+=("$2")
        shift 2
        ;;
      --grep|-g)
        grep_pattern="$2"
        shift 2
        ;;
      --)
        shift
        ;;
      -*)
        log_die "未知 logs 选项: $1（可用 --tail、--follow、--service、--grep）"
        ;;
      *)
        services+=("$1")
        shift
        ;;
    esac
  done

  if [ "${#services[@]}" -eq 0 ]; then
    services=(app web)
  fi

  load_deploy_credentials "$environment"

  local remote_dir
  remote_dir="$(docker_remote_dir_for_env "$environment")"

  # Compose v5 无 --ansi，靠 SSH pty 着色（_run_ssh 自动 -tt）；NO_COLOR 时显式去色
  local want_color=0
  local no_color_flag=""
  if [ -n "${NO_COLOR:-}" ]; then
    no_color_flag=" --no-color"
  elif [ -t 1 ] || [ -t 2 ] || [ "${FORCE_COLOR:-0}" = "1" ]; then
    want_color=1
  fi

  local logs_cmd
  logs_cmd="cd '${remote_dir}' && docker compose -f docker-compose.prod.yml logs${no_color_flag} --tail=${tail_lines}"
  if [ "$follow" -eq 1 ]; then
    logs_cmd+=" -f"
  fi
  # shellcheck disable=SC2145
  logs_cmd+=" ${services[*]}"

  if [ -n "$grep_pattern" ]; then
    # 管道使 compose 看不到 TTY；保留 grep 命中高亮
    local grep_color_flag=""
    if [ "$want_color" -eq 1 ]; then
      grep_color_flag=" --color=always"
    fi
    if [ "$follow" -eq 1 ]; then
      logs_cmd+=" 2>&1 | grep -Ei --line-buffered${grep_color_flag} $(printf '%q' "$grep_pattern")"
    else
      logs_cmd+=" 2>&1 | grep -Ei${grep_color_flag} $(printf '%q' "$grep_pattern")"
    fi
  fi

  log_info "日志: ${DEPLOY_SSH_USER}@${DEPLOY_HOST} (${environment}) → ${remote_dir}"
  log_info "服务: ${services[*]}  tail=${tail_lines}$([ "$follow" -eq 1 ] && printf ' follow' || true)$([ -n "$grep_pattern" ] && printf ' grep=%s' "$grep_pattern" || true)"

  _run_ssh "$logs_cmd"
}
