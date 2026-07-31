---
slug: quickstart
title: 快速开始
description: 5 分钟在本地跑起 be-water：安装依赖、起库、跑迁移、开双端。
---

## 前置要求

| 依赖    | 版本                       |
| ------- | -------------------------- |
| Node.js | 22+                        |
| pnpm    | 11+                        |
| Docker  | 用于本地 Postgres 与 Redis |

## 安装并启动

```bash
git clone <repo-url> && cd be-water
pnpm install
pnpm setup    # 幂等：生成 .env.local + 起 Postgres/Redis + 跑 migration
pnpm dev
```

启动后：

- 前端 `http://localhost:7300`（Vite HMR）
- API `http://localhost:3700`（`/api` 由 Vite 代理转发）

`pnpm setup` 可以重复执行，不会重置数据。只想起数据库时用 `pnpm db:up`。

## 环境变量

`pnpm setup` 会从 `.env.example` 生成 `.env.local`，其中三项必须有值：

| 变量                           | 说明                                                |
| ------------------------------ | --------------------------------------------------- |
| `DATABASE_URL`                 | `postgresql://be-water:...@localhost:5433/be-water` |
| `JWT_SECRET`                   | 不少于 32 字符的随机串                              |
| `TENANT_SECRET_ENCRYPTION_KEY` | 32 字节 hex，用 `openssl rand -hex 32` 生成         |

租户级密钥（例如各租户自己的 LLM API Key）以 AES-GCM 加密存库，主密钥就是
`TENANT_SECRET_ENCRYPTION_KEY`。**换掉它会导致已存密钥无法解密**，生产环境请妥善备份。

## 常用命令

| 命令                        | 说明                      |
| --------------------------- | ------------------------- |
| `pnpm dev`                  | 同时启动 server 与 client |
| `pnpm check`                | lint + 测试，提交前跑     |
| `pnpm db:studio`            | 打开 Prisma Studio        |
| `pnpm seed`                 | 灌入种子数据              |
| `pnpm build` / `pnpm start` | 构建 / 以生产模式启动     |

## 下一步

- 想用 Agent 扩模块：读 [Agent-first](/docs/agent-first)
- 想加功能：读[模块化架构](/docs/modules)，用 `pnpm gen:module` 生成骨架
- 想上线：读[部署](/docs/deploy)
