---
title: 模块化架构
description: 内置模块、外部模块、注册表与模块契约校验
category: core-concepts
sort_order: 40
---

功能以**模块**为单位组织，按需启用。`apps/server` 与 `apps/client` 是极薄的组装层，
业务逻辑全部在模块包里。

## 一个模块由什么组成

| 部分      | 放什么                                   |
| --------- | ---------------------------------------- |
| `shared/` | 跨端契约：类型、校验、纯逻辑             |
| `server/` | 路由 + 业务逻辑 + 该模块的 Prisma schema |
| `client/` | 页面 + 路由 + i18n                       |

每个模块用 `module.ts` / `module.tsx` 实现 `ServerAppModule` / `ClientAppModule`
接口，向内核注册路由、导航、权限与文案。

## 内置模块

在 `packages/builtin/*`，随平台一起发布：

| 模块                      | 职责                                     |
| ------------------------- | ---------------------------------------- |
| `user`                    | 用户与 JWT 认证                          |
| `rbac`                    | 角色与权限                               |
| `platform`                | 平台控制台：租户、套餐、配额             |
| `marketing`               | 站点 CMS：页面版式、文档库、会员入口     |
| `site-member`             | 站点会员身份                             |
| `billing`                 | 订阅与付款                               |
| `audit`                   | 审计日志                                 |
| `notification`            | 站内通知                                 |
| `background-job`          | 任务中心                                 |
| `error-log` / `slow-query`| 可观测性                                 |
| `dashboard`               | 工作台卡片聚合                           |

## 外部模块

第三方与定制功能放在仓库根的 `modules/*`（示例：`note`、`todo`、`bookmark`）：

- 只通过 `@rewindom/module-sdk` 门面与内核交互
- import 边界由 `verify-module.mjs` 强制校验
- 自带 Prisma schema，迁移统一由 `apps/server` 管理

接入流程见 [安装外部模块](/docs/install-external-module)。

## 模块间不许直接 import

一个模块不能 `import` 另一个模块的代码，跨模块协作走内核提供的扩展点：事件总线、
Provider、Slot。`requires` 只声明依赖关系与加载顺序，不给代码级访问。

理由是单向依赖分层：内核与基础设施不认识业务模块，业务模块之间也不互相认识，任何一个
都能单独删掉而不牵动其它。

## 注册表

启用哪些模块由两份注册表决定：

| 注册表          | 路径                                 |
| --------------- | ------------------------------------ |
| Server 启用模块 | `apps/server/src/enabled-modules.ts` |
| Client 启用模块 | `apps/client/src/enabled-modules.ts` |

顺序是 `基础设施 → 外壳 → 业务域`，保证依赖先于使用者加载。外部模块那一段由
`pnpm gen:external-modules` 生成，不要手工改。

## 路由前缀是硬约束

新模块的 `renderRoutes` / `nav.path` / `mobileTabPaths` **必须**用 `/app/<模块>`
前缀（如 `/app/site`、`/app/notes`）。挂在顶层的路由会在租户域名上被 CMS 吃掉。
原因见 [Host 分流机制](/docs/host-routing)。

## 校验与生成

```bash
pnpm gen:module <spec.yaml>          # 由 spec 生成模块骨架
pnpm check:modules                   # 注册表 / 租户列 / 开关 / 权限 / 排序 / 外壳 / nav / import 边界
pnpm check:deps                      # 循环依赖检测
node scripts/verify-module.mjs <id>  # 只查单个模块
```

标准路径是：填 spec → `gen:module` → 补业务逻辑 → `check:modules`。
