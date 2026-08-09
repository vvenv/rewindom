---
title: Host 分流机制
description: 同一进程按 Host 分流到产品站、控制台与租户站点
category: 核心概念
sort_order: 20
---

平台在本地与生产同构：同一个进程按 **Host** 分流，不是按 URL 路径分流。这是最容易踩坑的设计点，理解它之后很多「为什么 404」就豁然开朗。

## 三个入口

| Host                                | 是什么           | 入口                                      |
| ----------------------------------- | ---------------- | ----------------------------------------- |
| `FRONTEND_URL`（本地 `localhost`）  | 产品站=默认租户  | `/` 官网、`/app` 工作台、`/member/*` 会员 |
| `PLATFORM_URL`（本地 `127.0.0.1`）  | 平台控制台       | `/platform`（未登录转 `/login`）          |
| `custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}` | 租户站点 | 同产品站                          |

## 分流规则

- 租户 Host 上访问 `/platform` → 重定向到 `PLATFORM_URL`
- 控制台 Host 上访问 `/` → 重定向到 `/platform`

也就是说，**控制台入口只在 `PLATFORM_URL` 上开放**，租户站点上不会出现控制台。反过来，控制台 Host 上也没有租户站点内容。

## 为什么按 Host 而不是按路径

如果按路径分流（如 `/platform/*` 是控制台、`/*` 是站点），租户自定义域名上就会出现 `/platform` 这个控制台入口——租户用户能看到一个不属于他们的管理后台。按 Host 分流让控制台只在自己的 Host 上存在，租户站点上彻底干净。

## 本地的两个地址

本地开发时务必记住：

- `http://localhost:7300` — 产品站（默认租户的官网、工作台、会员）
- `http://127.0.0.1:7300` — 平台控制台

它们是**两个入口**，不是同一个。在浏览器里切换时注意地址栏的 Host。

## 租户子域

租户通过子域接入：`{slug}.{TENANT_BASE_DOMAIN}`。例如 `TENANT_BASE_DOMAIN=example.com`，租户 slug 为 `acme`，则 `acme.example.com` 是该租户的站点。

本地开发若要测租户子域，可以在 `/etc/hosts` 加：

```
127.0.0.1 acme.localhost
```

然后访问 `http://acme.localhost:7300`（前提是 `TENANT_BASE_DOMAIN=localhost` 且存在 slug=`acme` 的租户）。

## 自定义域名

租户可绑定自己的域名（如 `www.acme.com`）。绑定后该域名指向该租户站点，路由表现与子域一致。详见租户配置文档。

## 应用区前缀

无论哪个入口，租户应用区都挂在 `/app/*` 下：

- `/app/dashboard` — 工作台
- `/app/site` — 站点管理
- `/app/notes` — 笔记模块
- ……

`/` 留给租户 CMS（官网首页、文档库等），`/app/*` 是登录后的管理后台。
