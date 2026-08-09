---
title: 安装与部署
description: 生产环境部署、单租户模式与环境变量
category: 快速入门
---

# 安装与部署

本篇覆盖从构建到上线的完整部署流程，以及单租户模式的环境配置。

## 构建

```bash
pnpm build
pnpm start
```

`build` 会编译 server（esbuild bundle）与 client（Vite），`start` 跑生产进程。

## 环境变量

关键环境变量（完整列表见 `apps/server/.env.example`）：

| 变量                | 说明                                           |
| ------------------- | ---------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL 连接串                              |
| `FRONTEND_URL`      | 产品站地址（本地 `http://localhost:7300`）     |
| `PLATFORM_URL`      | 平台控制台地址（本地 `http://127.0.0.1:7300`） |
| `TENANT_BASE_DOMAIN`| 租户子域基域（如 `example.com`）               |
| `SINGLE_TENANT`     | `true` 时启用单租户模式                        |

### Host 分流

同一个进程按 Host 分流，不是按路径：

- `FRONTEND_URL` 的 Host → 产品站（默认租户）
- `PLATFORM_URL` 的 Host → 平台控制台
- `{slug}.{TENANT_BASE_DOMAIN}` 或租户自定义域名 → 该租户站点

生产环境务必保证这两个 Host 指向同一个进程，否则分流会失效。

## 单租户部署

面向只需一个实例的场景（如给单个客户私有部署）：

```bash
SINGLE_TENANT=true
```

单租户模式下：

- 平台控制台隐藏，不暴露租户管理
- 所有请求视为同一个默认租户
- 租户侧文案不出现「租户」「Tenant」字样

**门禁：** 提交前跑 `pnpm check:prod-app-env`，确保生产 env 透传正确。

## Docker 部署

仓库提供 `Dockerfile` 与 `docker/entrypoint.sh`。entrypoint 会自动检测迁移基线并执行 `prisma migrate deploy`，新环境无需手动跑迁移。

```bash
docker build -t be-water .
docker run -p 7300:7300 --env-file .env be-water
```

## 域名与反向代理

租户站点通过子域或自定义域名接入：

- 子域：`{slug}.{TENANT_BASE_DOMAIN}`
- 自定义域名：在平台控制台为租户绑定

反向代理（nginx）需把所有这些 Host 转发到同一个后端进程。注意 `/app/*` 前缀是租户应用区的统一入口。

## 常见问题

**Q: 为什么 `127.0.0.1:7300` 和 `localhost:7300` 看到的东西不一样？**
A: 它们是两个入口。`localhost` 是产品站，`127.0.0.1` 是平台控制台。详见 [Host 分流机制](/docs/host-routing)。

**Q: 新环境第一次启动需要跑迁移吗？**
A: Docker entrypoint 会自动跑 `migrate deploy`。手动部署时执行一次 `pnpm --filter server exec prisma migrate deploy` 即可。
