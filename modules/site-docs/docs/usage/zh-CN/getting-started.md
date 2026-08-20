---
title: 快速入门
description: 十分钟在本地把平台跑起来，并弄清「从哪个地址进」
category: getting-started
sort_order: 0
---

三条命令把整套平台跑起来，然后弄清本地那两个地址的区别——后者是新人最常踩的坑。

## 前置依赖

| 依赖    | 版本要求 | 用途                       |
| ------- | -------- | -------------------------- |
| Node.js | 22+      | 运行 server 与前端构建     |
| pnpm    | 11+      | monorepo 包管理            |
| Docker  | 任意近版 | 本地 PostgreSQL 与 Redis   |

## 1. 装依赖并初始化

```bash
pnpm install
pnpm setup
```

`pnpm setup` 是**幂等**的一键初始化：写出 `.env.local`、用 Docker 起 PostgreSQL 与
Redis、跑完所有迁移。重复执行不会破坏已有数据，所以拿不准状态时再跑一遍就好。

只想起数据库容器：`pnpm db:up`（停掉是 `pnpm db:down`）。

## 2. 启动开发服务器

```bash
pnpm dev
```

一条命令同时起 server 与 client。前端在 7300 端口，API 在 3700，`/api` 由 Vite 代理
过去——日常开发只需要记住 7300。

## 3. 从哪个地址进

本地按 **Host** 分流，这是最容易踩坑的一点：

| 地址                              | 是什么                                       |
| --------------------------------- | -------------------------------------------- |
| `http://localhost:7300/`          | 产品站（默认租户的官网）                     |
| `http://localhost:7300/app`       | 工作台，未登录自动转 `/login`                |
| `http://localhost:7300/member/login` | 站点会员登录（与工作台用户是两套身份）    |
| `http://127.0.0.1:7300/platform`  | 平台控制台                                   |

**`localhost` 与 `127.0.0.1` 是两个入口，不是同一个。** 在 `localhost` 上访问
`/platform` 会被送去 `127.0.0.1`；在 `127.0.0.1` 上访问 `/` 会被送进控制台。这是刻意
的设计，让本地不改 hosts 就能同时验证两种 Host。详见 [Host 分流机制](/docs/host-routing)。

## 4. 打开默认租户的站点

默认租户（slug 为 `rewindom`）的站点与这份文档库在**服务端启动时自动初始化**，不需要
手工执行任何脚本：默认首页会被创建并发布，文档库按语言各铺一套。

初始化是**幂等**的，而且按语言分别判断：某种语言已经有已发布文档就跳过那一份，不会
覆盖你后来的编辑。想给别的租户铺同样一套内容，或把默认租户重置回出厂内容：

```bash
pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [租户 slug]
```

> 这个脚本会**覆盖**目标租户的起步页面与文档草稿并重新发布。对着有内容的站点执行前
> 先想清楚。

## 下一步

- 理解入口分流 → [Host 分流机制](/docs/host-routing)
- 了解整体架构 → [多租户架构](/docs/multi-tenant)
- 动手改站点 → [建站与主题](/docs/build-site)
- 部署上线 → [安装与部署](/docs/installation)
