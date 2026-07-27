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
pnpm dev            # 前端 :5175，API :3400
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
# http://localhost:3400
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

# CI 分钟用尽：本地 Docker 部署 + 推送 tag
pnpm release patch -- --deploy-local --env production
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
curl http://127.0.0.1:3400/health
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DEPLOY_HOST` | SSH 主机（本机专用） |
| `APP_DOMAIN` | 对外域名 |
| `APP_PORT` | Docker web 映射到 127.0.0.1 的端口（默认 3400） |
| `DB_PASSWORD` | PostgreSQL 密码 |
| `JWT_SECRET` | JWT 签名密钥 |
| `TENANT_SECRET_ENCRYPTION_KEY` | 租户密钥加密（32 字节 hex） |

完整列表见 `scripts/env.production.example`。

更多问题见 `faq.md`。
