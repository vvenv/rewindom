# 部署文档

## 概述

be-water 采用 **Docker Compose** 统一部署：

- **本地开发**：`docker-compose.dev.yml` 提供 PostgreSQL + Redis；应用在宿主机 `pnpm dev`
- **生产/测试**：`docker-compose.prod.yml` 在服务器构建运行完整栈；宿主机 Nginx 终结 SSL

## 环境要求

### 开发机

- Node.js 22+、pnpm 11+
- Docker（`pnpm db:up`）

### 服务器

- Ubuntu 22.04 LTS（推荐）
- Docker + Docker Compose v2
- Nginx + Certbot（首次 bootstrap 自动安装）

## 开发环境

### 日常开发（推荐）

Docker 只跑 **Postgres + Redis**，应用在宿主机热更新：

```bash
git clone <repository-url>
cd be-water
pnpm install
pnpm setup          # 创建 .env.local、启动 DB、执行 migrate
pnpm dev            # 前端 :7300，API :3700
```

手动分步等价于 `pnpm setup`：

```bash
cp .env.example .env.local
pnpm db:up
pnpm --filter server exec prisma migrate deploy
pnpm dev
```

- 环境文件：`.env.local`（Prisma / 服务端优先读取，覆盖 `.env`）
- 数据库：`localhost:5433`（Docker 映射，避免与本机 Postgres 冲突）
- Redis：`localhost:6379`

### 生产镜像本地验证（可选）

发布前验证与线上一致的 Docker 栈：

```bash
cp scripts/env.docker.local.example .env.docker.local
pnpm docker:stack:up
# http://localhost:3700
pnpm docker:stack:down
```

与 `pnpm db:up` 使用不同 Compose 项目名，可同时存在；容器名也已区分（`be-water-dev-*` vs `be-water-*`）。

## 生产环境（Docker）

### 1. 配置环境变量

```bash
cp scripts/env.production.example .env.production
# 填写 DEPLOY_HOST、DB_PASSWORD、JWT_SECRET、APP_DOMAIN 等
```

### 2. 首次部署（bootstrap）

```bash
pnpm bootstrap -- --env production
```

流程：上传源码 → 远程 `docker compose build` → 启动栈 → 配置 Nginx + SSL → 健康检查。

### 3. 日常更新

```bash
pnpm deploy -- --env production
```

服务器执行 `docker compose build`。Dockerfile 已按 sibling **shipest** 做分层缓存（先 install 依赖清单、BuildKit pnpm store、prod prune）：**依赖未变时二次构建会快很多**；勿在服务器随意 `docker system prune` 清掉层缓存。

### 官网静态页（构建期生成）

`pnpm build` 里含一步预渲染：官网路由（`/`、`/pricing`、`/docs/*`）会渲染成真实 HTML，
连同 `sitemap.xml`、`robots.txt` 一起进 `apps/client/dist`，由 Nginx 直接返回。

canonical / og:url / sitemap 里的域名**写死在构建产物里**，来自 build arg `SITE_URL`
（compose 默认 `https://${APP_DOMAIN}`）。换域名必须重新构建，改运行时环境变量没用。

Nginx 侧对应两点（`docker/nginx/default.conf.template`，`APP_DOMAIN` 经 envsubst）：`try_files $uri $uri/index.html /app.html`；非平台 Host 的 HTML 文档反代到 app 做租户 Marketing SSR
命中预渲染出的目录索引；SPA 兜底文件是 `app.html`（带 `noindex`）而不是 `index.html`——
后者已经是官网落地页，拿它兜底会让刷新应用页先闪一屏官网。

### 4. 仅同步环境变量

```bash
pnpm deploy -- --env production --env-only
```

### 5. 本地验证生产 Compose

见上文「生产镜像本地验证」：`pnpm docker:stack:up`（`.env.docker.local`）。

远程目录：`/opt/be-water-docker`（production）、`/opt/be-water-docker-test`（test）。

## 发布

```bash
# 推送 tag 触发 GitHub Actions 自动 Docker 部署
pnpm release patch -- --push

# CI 分钟用尽：本地上传源码 → 服务器 build（--deploy-local）
pnpm release patch -- --deploy-local --env production

# 跳过本机 lint/test（假定 PR CI 已跑过）
pnpm release patch -- --no-check --deploy-local --env production
```

## 运维

### 日志

```bash
# 服务器上
cd /opt/be-water-docker
docker compose -f docker-compose.prod.yml logs -f app
```

GitHub Actions → **Ops** workflow：`status` / `logs` / `health-check` / `restart` / `stop` / `sync-env`。

### 数据库备份

```bash
bash /etc/be-water/scripts/backup.sh --env production
```

详见 `scripts/backup.sh`、`scripts/restore.sh`。

### 远程备份/还原（开发机）

```bash
./scripts/db-remote.sh pull --env production --fresh
./scripts/db-remote.sh push --env production --file ./backups/production/app_backup_xxx.dump --yes
```

### 本地还原

```bash
./scripts/restore-local.sh --latest
```

## 健康检查

```bash
curl http://127.0.0.1:3700/health
```

## 环境变量

| 变量                           | 说明                                            |
| ------------------------------ | ----------------------------------------------- |
| `DEPLOY_HOST`                  | SSH 主机（本机专用）                            |
| `APP_DOMAIN`                   | 对外域名                                        |
| `APP_PORT`                     | Docker web 映射到 127.0.0.1 的端口（默认 3700） |
| `DB_PASSWORD`                  | PostgreSQL 密码                                 |
| `JWT_SECRET`                   | JWT 签名密钥                                    |
| `TENANT_SECRET_ENCRYPTION_KEY` | 租户密钥加密（32 字节 hex）                     |
| `SINGLE_TENANT`                | `true` 时单租户部署（默认关闭）；须同时出现在 `.env.production` 与 `docker-compose.prod.yml` → `app.environment` |
| `TENANT_BASE_DOMAIN`           | 平台通配子域基域（如 `water.moms.plus`）；`{slug}.{base}` 自动锁定租户；空则关闭 |

完整列表见 `scripts/env.production.example`。新增应用运行时变量时，务必同步写入 `docker-compose.prod.yml` 的 `app.environment` 白名单（`docker-compose.dev.yml` 不需要）。

门禁：`pnpm check:prod-app-env`（从 `config.ts` 对照 compose + example；已挂 Architecture CI）。

### 租户自定义域名（可选）

应用层绑定：平台控制台为租户填写唯一 hostname；客户配 DNS；运维配 TLS。同一实例可服务多域名（Nginx `server_name _` + 透传 `Host`）。

**完整步骤、客户说明模板与验收清单**：见 [`custom-domain.md`](./custom-domain.md)。设计口径：[`design/tenant-config.md`](./design/tenant-config.md) §5.9。

更多问题见 `faq.md`。
