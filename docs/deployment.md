# 部署文档

## 概述

Rewindom 采用 **Docker Compose** 统一部署：

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
cd rewindom
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

与 `pnpm db:up` 使用不同 Compose 项目名，可同时存在；容器名也已区分（`rewindom-dev-*` vs `rewindom-*`）。

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

### 官网（租户 CMS SSR）

产品主域与其它绑定 Host 的 HTML 文档由 Nginx 反代到 Fastify Marketing SSR；
仅 `PLATFORM_HOST`（平台控制台）走静态 SPA（`app.html`）。
应用壳路径（`/app`、`/login`、`/platform` 等）始终走 SPA。

### 4. 仅同步环境变量

```bash
pnpm deploy -- --env production --env-only
```

### 5. 本地验证生产 Compose

见上文「生产镜像本地验证」：`pnpm docker:stack:up`（`.env.docker.local`）。

远程目录：`/opt/rewindom-docker`（production）、`/opt/rewindom-docker-test`（test）。

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

### 宿主机 Nginx 的 HTTP/2

**443 那行 listen 不是本仓库渲染的**——`docker_render_host_nginx_proxy` 只写
`listen 80`，TLS 那个 server 块由 `certbot --nginx` 接管并补上 `listen 443 ssl;`。
certbot 从不开 HTTP/2，所以裸装出来的站点会一直停在 HTTP/1.1。

部署脚本每次都会跑一遍 `docker_enable_host_nginx_http2`（幂等）：给本仓库管的 vhost
（`# rewindom-` 开头那两种）的 443 listen 补上 `http2`，`nginx -t` 通过才 reload，
失败自动回滚。新签自定义域时 `acme-helper.py` 也会在 certbot 之后补一次。

自查：

```bash
curl -sI -o /dev/null -w "%{http_version}\n" https://<域名>/   # 期望 2
```

nginx ≥ 1.25.1 起 `http2 on;` 是新写法，listen 参数仍生效（`nginx -t` 会提示
deprecated）。生产当前是 1.24，listen 参数是那儿**唯一**的写法。

### 日志

```bash
# 服务器上
cd /opt/rewindom-docker
docker compose -f docker-compose.prod.yml logs -f app
```

GitHub Actions → **Ops** workflow：`status` / `logs` / `health-check` / `restart` / `stop` / `sync-env`。

### 数据库备份

```bash
bash /etc/rewindom/scripts/backup.sh --env production
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

| 变量                           | 说明                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `DEPLOY_HOST`                  | SSH 主机（本机专用）                                                                                             |
| `APP_DOMAIN`                   | 产品主域（默认租户 CMS）                                                                                         |
| `PLATFORM_URL`                 | 平台控制台 origin（默认 `https://admin.${APP_DOMAIN}`）                                                          |
| `PLATFORM_HOST`                | Nginx 上平台控制台 hostname（默认 `admin.${APP_DOMAIN}`）                                                        |
| `APP_PORT`                     | Docker web 映射到 127.0.0.1 的端口（默认 3700）                                                                  |
| `DB_PASSWORD`                  | PostgreSQL 密码                                                                                                  |
| `JWT_SECRET`                   | JWT 签名密钥                                                                                                     |
| `TENANT_SECRET_ENCRYPTION_KEY` | 租户密钥加密（32 字节 hex）                                                                                      |
| `SINGLE_TENANT`                | `true` 时单租户部署（默认关闭）；须同时出现在 `.env.production` 与 `docker-compose.prod.yml` → `app.environment` |
| `TENANT_BASE_DOMAIN`           | 平台通配子域基域（如 `rewindom.com`）；`{slug}.{base}` 自动锁定租户；空则关闭                                    |
| `STRIPE_SECRET_KEY`            | 商店收款平台默认 Stripe Secret（站点设置可覆盖）                                                                 |
| `STRIPE_WEBHOOK_SECRET`        | 商店收款平台默认 Stripe Webhook Secret                                                                           |
| `STRIPE_PUBLISHABLE_KEY`       | 商店收款平台默认 Stripe Publishable Key                                                                          |
| `ATTACHMENT_STORAGE`           | 文件存储后端：`local`（默认）/ `s3` / `r2`（Cloudflare R2）                                                      |
| `S3_ENDPOINT`                  | S3 兼容 endpoint；R2 为 `https://<account_id>.r2.cloudflarestorage.com`                                          |
| `S3_REGION`                    | 默认 `auto`（R2 要求）                                                                                           |
| `S3_BUCKET`                    | 对象存储 bucket                                                                                                  |
| `S3_ACCESS_KEY_ID`             | 对象存储 Access Key                                                                                              |
| `S3_SECRET_ACCESS_KEY`         | 对象存储 Secret                                                                                                  |
| `S3_PUBLIC_BASE_URL`           | 公开读 CDN / r2.dev / 自定义域；空则由应用转发字节                                                               |

完整列表见 `scripts/env.production.example`。新增应用运行时变量时，务必同步写入 `docker-compose.prod.yml` 的 `app.environment` 白名单（`docker-compose.dev.yml` 不需要）。

门禁：`pnpm check:prod-app-env`（从 `config.ts` 对照 compose + example；已挂 Architecture CI）。

### 租户自定义域名（可选）

应用层绑定：平台控制台为租户填写唯一 hostname；客户配 DNS；平台管理员点「签发证书」（宿主机 ACME helper + Let's Encrypt）。同一实例可服务多域名。

需要 `ACME_HELPER_TOKEN`（及可选 `ACME_HELPER_URL`，compose 默认 `http://host.docker.internal:9370`）。`pnpm deploy` 会安装 helper。

**完整步骤、客户说明模板与验收清单**：见 [`custom-domain.md`](./custom-domain.md)。设计口径：[`design/tenant-config.md`](./design/tenant-config.md) §5.9。

更多问题见 `faq.md`。
