---
title: 安装与部署
description: 构建、环境变量、Docker 镜像与单租户部署
category: getting-started
sort_order: 10
---

从构建到上线的完整流程，以及生产环境最容易配错的那几项。

## 构建与启动

```bash
pnpm build
pnpm start
```

`build` 并行编译两端：client 走 Vite 出静态资源，server 走 esbuild 打成单文件
`apps/server/dist/index.js`。`start` 就是 `node dist/index.js`。

> server 是**单文件 bundle**，运行时不会去读源码目录里的旁路文件。需要随代码走的
> 内容（站点 CSS、默认租户的文档）都在构建期内联进产物，靠的是各自的 `assemble`
> 脚本——新增这类资源时照着做，别在运行时 `readFile` 相对路径。

## 环境变量

完整清单见仓库根的 `.env.example`。上线必须想清楚的几项：

| 变量                           | 说明                                             |
| ------------------------------ | ------------------------------------------------ |
| `DATABASE_URL`                 | PostgreSQL 连接串                                |
| `JWT_SECRET`                   | 至少 32 字符的随机串                             |
| `TENANT_SECRET_ENCRYPTION_KEY` | 租户密钥加密主密钥，32 字节 hex（`openssl rand -hex 32`） |
| `FRONTEND_URL`                 | 产品站地址                                       |
| `PLATFORM_URL`                 | 平台控制台地址，**必须与 `FRONTEND_URL` 不同 Host** |
| `TENANT_BASE_DOMAIN`           | 租户子域基域（如 `example.com`）                 |
| `SINGLE_TENANT`                | `true` 时启用单租户模式                          |

### 为什么两个 URL 必须不同 Host

分流是按 Host 做的，不是按路径。两者同 Host 时控制台与产品站会互相抢同一个入口，
表现就是「访问 `/platform` 被无限重定向」。反向代理也依赖这一点：平台 Host 直接发
静态 SPA，其余 Host 的 HTML 反代给 Marketing SSR。

## Docker

镜像定义在 `docker/Dockerfile`，三段式：`builder` 装依赖并构建，`app` 是 Node API
进程，`web` 是带静态资源的 Nginx。

```bash
# 本地用生产镜像验证一遍完整链路
pnpm docker:stack:up
pnpm docker:stack:logs
pnpm docker:stack:down
```

`docker/entrypoint.sh` 在启动前自动检测迁移基线并执行 `prisma migrate deploy`，**新
环境不需要手工跑迁移**。非容器部署时手工执行一次：

```bash
pnpm --filter server exec prisma migrate deploy
```

## 首次启动会自动做的事

server 起来后会先跑一遍幂等的初始化：建默认租户、给它铺一套已发布的起步站点与文档
库、建平台系统管理员。所以一个空库部署完就能直接访问，不需要额外的 seed 步骤。

## 单租户部署

面向只服务一个客户的私有部署：

```bash
SINGLE_TENANT=true
```

此时保留 Tenant 模型但禁止新建租户，自助注册与 OAuth 首次登录一律并入默认租户，平台
侧的租户管理入口隐藏，租户侧文案不出现「租户」字样。

**门禁：** 改动生产 env 透传后跑一次 `pnpm check:prod-app-env`。

## 反向代理

租户站点通过子域（`{slug}.{TENANT_BASE_DOMAIN}`）或自定义域名接入。反代需要把这些
Host **全部**转发到同一个后端进程，并保留原始 `Host` 头——租户就是靠它解析出来的。

参考配置见 `docker/nginx/default.conf.template`。

## 下一步

- 入口与分流细节 → [Host 分流机制](/docs/host-routing)
- 租户与域名管理 → [租户管理](/docs/tenant-management)
