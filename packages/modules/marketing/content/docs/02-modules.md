---
slug: modules
title: 模块化架构
description: 内核、基础设施与业务模块的边界，以及新增一个模块要碰的注册表。
---

## 三条硬规则

1. **内核不依赖业务** —— HTTP 栈、认证、租户上下文、模块加载器、事件总线都在内核，
   业务模块可以整个删掉而内核照常启动。
2. **模块间禁止直接 import** —— 跨模块通信走 manifest 的 `requires` 声明，
   加事件总线、Provider 或 Slot，不允许一个业务模块直接引另一个业务模块的内部实现。
3. **模块可按租户开关** —— 未开通的模块不挂路由、不进侧栏，前后端都不给入口。

这三条由 `pnpm check:deps` 强制：包层依赖环、manifest 与 schema 外键的一致性、
文件级循环依赖都会在 CI 里被拦下。

## 一个模块长什么样

```
packages/modules/<id>/
├── MODULE.md          # 模块说明（边界、扩展点、注意事项）
├── schema.prisma      # 自己的数据模型，含 tenant_id
├── shared/            # 跨端契约与纯逻辑
├── server/            # Fastify 路由 + service
└── client/            # 页面、hooks、导航贡献
```

`apps/server` 与 `apps/client` 只是极薄的组装层：模块加载只看两处
`enabled-modules.ts`，其余全在模块包内自洽。

## 新增模块

标准路径是 **填 spec → 生成 → 补业务逻辑 → 校验**（Agent-first 闭环，详见 [Agent-first](/docs/agent-first)）：

```bash
pnpm gen:module <spec.yaml>            # 生成骨架并完成 6 处注册
pnpm --filter server exec prisma migrate dev --name add_<id>
pnpm check:modules                     # 模块契约校验
```

生成器会一并处理容易漏的装配点：两处 `enabled-modules.ts`、CI 用的静态 manifest、
租户守卫的 `MODEL_POLICIES`、lint 的租户模型清单、审计动作枚举，以及 Prisma 的符号链接。
手工加这六处，漏一处就是一个静默 bug。

## 前端页面分层

页面按四层拆：`Page`（外壳与编排）、`Hook`（状态与副作用）、`Lib`（纯函数）、
`Component`（展示）。租户页必须套 `PageLayout`，平台控制台页不套（外壳自带标题）。

## 权限

权限是 PBAC：模块在 manifest 的 `shared.permissions` 里声明 key，
后端用 `requirePermission` 守路由，前端用 `PermissionRoute` 与 `hasPermission` 守入口。
两边的 key 必须字面一致，否则权限会静默失效。
