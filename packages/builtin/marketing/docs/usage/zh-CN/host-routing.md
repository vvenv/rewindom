---
title: Host 分流机制
description: 同一个进程按 Host 分流到产品站、控制台与租户站点
category: 核心概念
sort_order: 20
---

同一个进程按 **Host** 分流，不是按 URL 路径。本地与生产同构，只是换成真实域名。理解
这一条之后，很多「为什么 404」「为什么被重定向」都会豁然开朗。

## 三类入口

| Host                                            | 是什么          | 能访问什么                                |
| ----------------------------------------------- | --------------- | ----------------------------------------- |
| `FRONTEND_URL`（本地 `localhost`）              | 产品站=默认租户 | `/` 官网、`/app` 工作台、`/member/*` 会员 |
| `PLATFORM_URL`（本地 `127.0.0.1`）              | 平台控制台      | `/platform`（未登录转 `/login`）          |
| `custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}` | 租户站点        | 与产品站相同的三块                        |

分流规则只有两条：

- 租户 Host 上访问 `/platform` → 送去 `PLATFORM_URL`
- 控制台 Host 上访问 `/` → 送去 `/platform`

## 为什么不按路径分

按路径分（`/platform/*` 归控制台、其余归站点）意味着**每个租户的自定义域名上都挂着
一个控制台入口**——租户的访客能看到一个不属于他们的管理后台。按 Host 分让控制台只在
自己的 Host 上存在，租户站点上彻底干净。

## 应用区一律在 `/app/*` 之下

租户 Host 的 `/` 归租户 CMS：首页、自建页面、文档库都在那儿。登录后的应用区靠一级
路径前缀让开：

- `/app/dashboard` — 工作台
- `/app/site` — 站点管理
- `/app/notes` — 笔记模块
- ……

这不只是命名习惯。这份前缀表在 SSR 兜底、nginx location、Vite dev 代理里**各有一份
副本**，每个模块各占一个顶层路径时三份都得跟着长——`/site`、`/dashboard`、
`/audit-logs` 就是这么漏掉的，在绑定域名上一直返回 404。收进 `/app/*` 之后三处都只
需要一个 `app`，顶层 slug 也还给了租户站点。

## 本地怎么测多租户

把基域设成 `localhost`：

```bash
TENANT_BASE_DOMAIN=localhost
```

然后直接访问 `http://{slug}.localhost:7300`。浏览器原生把 `*.localhost` 解析到回环
地址，**不用改 hosts 文件**。三个入口互不影响：`localhost` 仍是默认租户、
`127.0.0.1` 仍是平台控制台、`{slug}.localhost` 是对应租户。

要验自定义域名那条分支，把某个租户的 `custom_domain` 设成 `shop.localhost` 之类的值
即可，同样直接可访问。

## 语言前缀

站点主语言的 URL **不带**语言前缀（它是 SEO 主入口），其余语言走 `/{locale}/…`
子目录，例如 `/en/docs`。语言段与页面路径在 URL 上是同一个位置，靠取值区分——所以
`en`、`zh-CN` 这类值不能拿来当页面路径。

## 下一步

- 租户与数据隔离 → [多租户架构](/docs/multi-tenant)
- 生产域名配置 → [安装与部署](/docs/installation)
