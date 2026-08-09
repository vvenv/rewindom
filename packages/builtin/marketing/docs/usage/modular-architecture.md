---
title: 模块化架构
description: 内置模块、外部模块与模块注册表
category: 核心概念
sort_order: 40
---

平台采用模块化设计：功能以模块为单位组织，按需启用。`apps/server` 与 `apps/client` 只是极薄的组装层，业务逻辑全部在 `packages/modules/*`（或 `packages/builtin/*`）里。

## 模块是什么

一个模块是一个独立 workspace 包，包含：

| 部分     | 作用                                   |
| -------- | -------------------------------------- |
| `shared/`| 跨端契约（类型定义、DTO）              |
| `server/`| 服务端（路由 + 业务逻辑 + Prisma schema）|
| `client/`| 客户端（UI + 路由 + i18n）             |

每个模块通过 `module.ts` / `module.tsx` 实现 `ServerAppModule` / `ClientAppModule` 接口，向内核注册路由、导航、权限、i18n。

## 内置模块

位于 `packages/builtin/*`，随平台一起发布：

- **marketing** — 站点 CMS、页面版式、文档库、会员入口
- **platform** — 平台控制台（租户管理、用户、配额）
- **user** — 用户管理
- **rbac** — 角色与权限
- **audit** — 审计日志
- **billing** — 计费与订阅
- **dashboard** — 工作台卡片聚合
- 以及 error-log、slow-query、notification、background-job、site-member 等

## 外部模块

第三方或定制功能以外部模块形式接入，位于 `packages/modules/*`（或 `packages/external-modules/*`）：

- 通过 `@be-water/module-sdk` 门面与内核交互
- 边界受 `verify-module.mjs` 强制校验（import 白名单）
- 自带 Prisma schema，由 server 统一管理迁移

接入流程见 [安装外部模块](/docs/install-external-module)。

## 模块注册表

启用哪些模块由两个注册表决定：

| 注册表           | 路径                                  |
| ---------------- | ------------------------------------- |
| Server 启用模块  | `apps/server/src/enabled-modules.ts`  |
| Client 启用模块  | `apps/client/src/enabled-modules.ts`  |

注册表按 `infra → shell → 业务域` 排序，保证依赖顺序。

## 路由约定

新模块的 `renderRoutes` / `nav.path` / `mobileTabPaths` **必须**用 `/app/<模块>` 前缀（如 `/app/site`、`/app/notes`）。

原因：租户 Host 上 `/` 归租户 CMS，应用区靠 `/app/*` 一级前缀区分。收进 `/app/*` 后，新增模块不必再碰 nginx location、vite dev 代理、`SITE_APP_PREFIXES` 三份前缀表。

## 模块契约校验

改动模块后必须跑：

```bash
pnpm check:modules
```

校验项包括：注册表、租户列、开关、权限、排序、外壳、nav、import 边界。

## 新建模块

标准路径：填 spec → `gen:module` → 补 service 业务逻辑 → `check:modules`。

```bash
pnpm gen:module <spec.yaml>
```

spec 模板在 `.cursor/skills/create-module/templates/MODULE.spec.yaml`。
