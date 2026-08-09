---
title: 快速入门
description: 5 分钟在本地把平台跑起来
category: 快速入门
sort_order: 0
---

本篇带你用最短时间在本地把整套平台跑起来，并理解「从哪个地址进」。

## 前置依赖

| 依赖     | 版本要求      |
| -------- | ------------- |
| Node.js  | ^20.19.0      |
| pnpm     | ^10.0.0       |
| PostgreSQL | 15+（本地或 Docker） |

## 1. 安装依赖

仓库根目录执行：

```bash
pnpm install
```

monorepo 会把 `apps/server`、`apps/client` 与所有 `packages/*` 一次装好。

## 2. 准备数据库

需要本地 PostgreSQL。最快的方式用 Docker：

```bash
docker run -d --name be-water-dev-postgres \
  -e POSTGRES_USER=be-water \
  -e POSTGRES_PASSWORD=be-water \
  -e POSTGRES_DB=be-water \
  -p 5433:5432 \
  postgres:15
```

然后在 `apps/server/.env` 里配置 `DATABASE_URL`（参考 `.env.example`）。

## 3. 同步表结构

```bash
pnpm --filter server exec prisma migrate deploy
pnpm --filter server exec prisma generate
```

> 开发新功能需要改表时用 `prisma migrate dev --name <name>`。**禁止随意 `reset`**，优先增量 migration。

## 4. 启动开发服务器

```bash
pnpm dev
```

一条命令同时起 server 与 client。

## 5. 从哪个地址进

本地按 **Host** 分流，这是最容易踩坑的一点：

| Host              | 是什么         | 入口                                  |
| ----------------- | -------------- | ------------------------------------- |
| `localhost`       | 产品站=默认租户 | `/` 官网、`/app` 工作台、`/member/*` 会员 |
| `127.0.0.1`       | 平台控制台     | `/platform`（未登录转 `/login`）      |

- 在 `localhost` 上访问 `/platform` 会被重定向到 `127.0.0.1`。
- 在 `127.0.0.1` 上访问 `/` 会被重定向到 `/platform`。

**记住：`localhost` 和 `127.0.0.1` 是两个入口，不是同一个。**

## 6. 初始化默认租户的站点

首次启动后，默认租户的营销站是空的。用 seed 脚本铺一套起步模板：

```bash
pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts
```

这会为默认租户（slug=`default`）创建首页、文档库等起步内容，并自动发布。

## 下一步

- 了解整体架构 → 阅读 [多租户架构](/docs/multi-tenant)
- 想搭自己的站点 → 阅读 [建站与主题](/docs/build-site)
- 部署上线 → 阅读 [安装与部署](/docs/installation)
