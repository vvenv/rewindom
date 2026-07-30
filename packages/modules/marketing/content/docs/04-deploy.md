---
slug: deploy
title: 部署
description: 用 Docker Compose 交付生产环境：首次引导、日常更新与发版。
---

## 交付形态

生产与测试环境都走 Docker Compose（`docker-compose.prod.yml`），
宿主机上的 Nginx 终结 SSL 并把 `/api` 反代到应用容器。前端是构建产物，
官网页面在构建期预渲染成静态 HTML，由 Nginx 直接返回。

## 首次部署

```bash
cp scripts/env.production.example .env.production
pnpm bootstrap -- --env production
```

`bootstrap` 会拉起数据库与 Redis、跑 `prisma migrate deploy`、构建镜像并启动应用。

## 日常更新

```bash
pnpm deploy -- --env production
```

也可以打标签让 CI 接手：

```bash
git tag v1.2.3 && git push --tags
```

GitHub Actions 会构建镜像并部署。

## 数据库迁移

迁移一律增量，**禁止随意 reset**。生产环境只跑 `prisma migrate deploy`：

```bash
pnpm --filter server exec prisma migrate deploy
```

需要收敛历史迁移时走离线 diff 生成 + baseline 标记的流程，不要在有数据的库上重置。

## 排障

| 命令                   | 用途                     |
| ---------------------- | ------------------------ |
| `pnpm logs`            | 拉取远端容器日志         |
| `pnpm docker:stack:up` | 在本地跑一套生产形态的栈 |
| `/health`              | 应用健康检查端点         |

错误日志与慢查询都有内建看板，线上问题优先从那里查，而不是翻容器日志。
