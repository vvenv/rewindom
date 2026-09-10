#!/bin/bash
# 运行时拓扑探测：数据库与 Redis 到底跑在哪。
#
# ## 为什么需要这一层
#
# 备份/还原脚本最早写于「宿主机装 Postgres + Redis」的年代，一路都是
# `sudo -u postgres pg_dump` 和裸 `redis-cli`。后来生产整体搬进 Docker
# （docker-compose.prod.yml，且**不发布端口**），那两条命令在服务器上根本找不到
# 服务端——备份从此静默失效，而 cron 每天照跑不误，日志里也只是一行失败。
#
# 备份坏掉的代价是不对称的：平时毫无感觉，需要它的那一天什么都没有。所以这里
# 不去猜环境，而是**探测**：有容器就走容器，没有就退回宿主机命令，两种拓扑都能跑。
#
# 库名/用户名同样不写死——直接从容器的环境变量里读。历史上 backup.sh 按
# `--env` 把库名映射成 rewindom / app_test，而 compose 里 `POSTGRES_DB` 恒为
# rewindom，两边早就对不上了。

# 容器名。调用方可在 source 之前显式指定（如开发栈的 rewindom-dev-postgres），
# 那样的值优先级最高；否则由前缀推导，后续可用 stack_set_container_prefix 改。
#
# 记下「是不是调用方显式给的」——不记的话，source 时填进去的默认值会让后面的
# `: "${VAR:=...}"` 永远不触发，按环境切前缀就成了空操作（这个坑踩过一次）。
_STACK_PG_CONTAINER_EXPLICIT="${STACK_PG_CONTAINER:+1}"
_STACK_REDIS_CONTAINER_EXPLICIT="${STACK_REDIS_CONTAINER:+1}"
_STACK_APP_CONTAINER_EXPLICIT="${STACK_APP_CONTAINER:+1}"

STACK_CONTAINER_PREFIX="${STACK_CONTAINER_PREFIX:-rewindom}"
STACK_PG_CONTAINER="${STACK_PG_CONTAINER:-${STACK_CONTAINER_PREFIX}-postgres}"
STACK_REDIS_CONTAINER="${STACK_REDIS_CONTAINER:-${STACK_CONTAINER_PREFIX}-redis}"
STACK_APP_CONTAINER="${STACK_APP_CONTAINER:-${STACK_CONTAINER_PREFIX}-app}"

# 按环境切换容器名前缀（production=rewindom，test=rewindom-test，与 compose 的
# CONTAINER_PREFIX 同源）。显式指定过的名字不动。必须在 stack_init 之前调用。
stack_set_container_prefix() {
  STACK_CONTAINER_PREFIX="$1"
  [ -n "$_STACK_PG_CONTAINER_EXPLICIT" ] || STACK_PG_CONTAINER="${1}-postgres"
  [ -n "$_STACK_REDIS_CONTAINER_EXPLICIT" ] || STACK_REDIS_CONTAINER="${1}-redis"
  [ -n "$_STACK_APP_CONTAINER_EXPLICIT" ] || STACK_APP_CONTAINER="${1}-app"
}

_container_running() {
  local name="$1"
  command -v docker >/dev/null 2>&1 || return 1
  [ "$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null)" = "true" ]
}

# 从容器里读一个环境变量（docker inspect 的 Env 是 KEY=VALUE 数组）
_container_env() {
  local name="$1" key="$2"
  docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$name" 2>/dev/null \
    | sed -n "s/^${key}=//p" | head -1
}

# 一次性探测并**固化**拓扑。必须由脚本直接调用（不能写成 `$(stack_init)`——
# 命令替换跑在子 shell 里，赋值传不回来，缓存等于没有）。
#
# 固化是必要的，不只是省几次 docker inspect：还原 Redis 时会先 `docker stop`，
# 容器一停实时探测就翻成 host，随后的「启动 Redis」变成 `systemctl start redis`，
# 于是 Redis 再也起不来——数据还原完了，服务却是死的。
stack_init() {
  _STACK_PG_MODE="$(_detect_pg_mode)"
  _STACK_REDIS_MODE="$(_detect_redis_mode)"
}

# ---------------------------------------------------------------- PostgreSQL

_detect_pg_mode() {
  if _container_running "$STACK_PG_CONTAINER"; then
    echo "docker"
  elif command -v pg_dump >/dev/null 2>&1 && id -u postgres >/dev/null 2>&1; then
    echo "host"
  else
    echo "none"
  fi
}

stack_pg_mode() {
  echo "${_STACK_PG_MODE:-$(_detect_pg_mode)}"
}

# 应用库名：容器里以 POSTGRES_DB 为准，宿主机模式用调用方给的默认值
stack_pg_db_name() {
  local fallback="${1:-rewindom}"
  if [ "$(stack_pg_mode)" = "docker" ]; then
    local name
    name="$(_container_env "$STACK_PG_CONTAINER" POSTGRES_DB)"
    echo "${name:-$fallback}"
  else
    echo "$fallback"
  fi
}

stack_pg_user() {
  local fallback="${1:-rewindom}"
  if [ "$(stack_pg_mode)" = "docker" ]; then
    local user
    user="$(_container_env "$STACK_PG_CONTAINER" POSTGRES_USER)"
    echo "${user:-$fallback}"
  else
    echo "postgres"
  fi
}

# 以超级用户身份跑 psql。容器里 POSTGRES_USER 就是超级用户；宿主机上是 postgres。
# 用法与 psql 一致，stdin 透传（`stack_psql -d x -f -` 之类都能用）。
stack_psql() {
  case "$(stack_pg_mode)" in
    docker)
      docker exec -i -u postgres "$STACK_PG_CONTAINER" \
        psql -U "$(stack_pg_user)" "$@"
      ;;
    host)
      sudo -u postgres psql "$@"
      ;;
    *)
      echo "[stack] 找不到 PostgreSQL（容器 ${STACK_PG_CONTAINER} 未运行，宿主机也没有 psql）" >&2
      return 1
      ;;
  esac
}

# pg_dump **写 stdout**，由调用方重定向到宿主机文件。
# 不用 `-f`：容器内的路径对宿主机没有意义，落进容器里等于没备份。
stack_pg_dump() {
  case "$(stack_pg_mode)" in
    docker)
      docker exec -u postgres "$STACK_PG_CONTAINER" \
        pg_dump -U "$(stack_pg_user)" "$@"
      ;;
    host)
      sudo -u postgres pg_dump "$@"
      ;;
    *)
      echo "[stack] 找不到 PostgreSQL" >&2
      return 1
      ;;
  esac
}

# pg_restore **读 stdin**，与 stack_pg_dump 对称。
stack_pg_restore() {
  case "$(stack_pg_mode)" in
    docker)
      docker exec -i -u postgres "$STACK_PG_CONTAINER" \
        pg_restore -U "$(stack_pg_user)" "$@"
      ;;
    host)
      sudo -u postgres pg_restore "$@"
      ;;
    *)
      echo "[stack] 找不到 PostgreSQL" >&2
      return 1
      ;;
  esac
}

# --------------------------------------------------------------------- Redis

_detect_redis_mode() {
  if _container_running "$STACK_REDIS_CONTAINER"; then
    echo "docker"
  elif command -v redis-cli >/dev/null 2>&1; then
    echo "host"
  else
    echo "none"
  fi
}

stack_redis_mode() {
  echo "${_STACK_REDIS_MODE:-$(_detect_redis_mode)}"
}

# redis-cli；容器模式下自动带上 requirepass 的密码（compose 里是 REDIS_PASSWORD）
stack_redis_cli() {
  case "$(stack_redis_mode)" in
    docker)
      local pw
      pw="$(_container_env "$STACK_REDIS_CONTAINER" REDIS_PASSWORD)"
      if [ -n "$pw" ]; then
        docker exec -i "$STACK_REDIS_CONTAINER" redis-cli -a "$pw" --no-auth-warning "$@"
      else
        docker exec -i "$STACK_REDIS_CONTAINER" redis-cli "$@"
      fi
      ;;
    host)
      redis-cli "$@"
      ;;
    *)
      echo "[stack] 找不到 Redis" >&2
      return 1
      ;;
  esac
}

# RDB 文件在服务端的路径（dir + dbfilename）。**要在停服之前问**——
# 停了就没人回答 CONFIG GET 了。
stack_redis_rdb_path() {
  local dir dbfile
  dir="$(stack_redis_cli CONFIG GET dir | tail -1 | tr -d '\r')"
  dbfile="$(stack_redis_cli CONFIG GET dbfilename | tail -1 | tr -d '\r')"
  [ -n "$dir" ] && [ -n "$dbfile" ] || return 1
  echo "${dir}/${dbfile}"
}

# 把 RDB 快照读到 stdout
stack_redis_cat_rdb() {
  local rdb
  rdb="$(stack_redis_rdb_path)" || return 1
  case "$(stack_redis_mode)" in
    docker) docker exec "$STACK_REDIS_CONTAINER" cat "$rdb" ;;
    host)   cat "$rdb" ;;
    *)      return 1 ;;
  esac
}

# 探测宿主机 redis 的 systemd 服务名（redis / redis-server）
_host_redis_service() {
  if systemctl list-unit-files 2>/dev/null | grep -qE '^redis\.service'; then
    echo "redis"
  elif systemctl list-unit-files 2>/dev/null | grep -qE '^redis-server\.service'; then
    echo "redis-server"
  else
    echo ""
  fi
}

stack_redis_stop() {
  case "$(stack_redis_mode)" in
    docker) docker stop "$STACK_REDIS_CONTAINER" >/dev/null ;;
    host)
      local svc
      svc="$(_host_redis_service)"
      [ -n "$svc" ] && systemctl stop "$svc"
      ;;
  esac
}

stack_redis_start() {
  case "$(stack_redis_mode)" in
    docker) docker start "$STACK_REDIS_CONTAINER" >/dev/null ;;
    host)
      local svc
      svc="$(_host_redis_service)"
      [ -n "$svc" ] && systemctl start "$svc"
      ;;
  esac
}

# 用备份覆盖 RDB。第二个参数是停服前问到的路径——此刻 Redis 已经停了，问不出来了。
# `docker cp` 对已停止的容器同样有效。
stack_redis_write_rdb() {
  local src="$1" rdb="$2"
  case "$(stack_redis_mode)" in
    docker) docker cp "$src" "${STACK_REDIS_CONTAINER}:${rdb}" ;;
    host)   cp "$src" "$rdb" ;;
    *)      return 1 ;;
  esac
}

# ------------------------------------------------------------ 应用数据卷 /data
#
# 附件与导出件躺在这里（ATTACHMENT_BASE_DIR=/data/attachments、EXPORT_BASE_DIR）。
# 本地存储模式下它们只有这一份——数据库备份得再勤，丢了附件也是丢了。

# 返回挂到容器 /data 上的卷名（没有则为空）
stack_data_volume() {
  _container_running "$STACK_APP_CONTAINER" || return 1
  docker inspect -f \
    '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' \
    "$STACK_APP_CONTAINER" 2>/dev/null
}

# 把 /data 打成 tar.gz 写到 stdout。
# 用独立的 alpine 容器挂只读卷，而不是 `docker exec app tar`：
# app 停着（部署中、崩溃后）时照样能备份，而那正是最需要备份的时候。
stack_data_tar() {
  local volume="$1"
  docker run --rm -v "${volume}:/src:ro" alpine:3 tar czf - -C /src .
}

# 从 tar.gz 还原 /data
stack_data_untar() {
  local volume="$1"
  docker run --rm -i -v "${volume}:/dst" alpine:3 \
    sh -c 'rm -rf /dst/* /dst/.[!.]* 2>/dev/null; tar xzf - -C /dst'
}
