---
name: extract-module
description: 从遗留 routes/services 迁出业务模块的 checklist。拆分单体路由、迁移 Prisma、注册 enabled-modules 时使用。
---

# 从单体迁出模块

Rule：`.cursor/rules/extension-points.mdc`（含跨模块通信决策表）  
设计文档：`docs/design/modular-architecture.md`（§3.4、§9.4、§10.5、§14）  
金标准参考：`modules/note/`

## 何时使用

- 将遗留路由迁入 `modules/<id>/`（业务）或 `packages/builtin/<id>/`（基础设施）
- 将域逻辑收拢到模块 service
- 拆分后从中央注册表移除引用

## 迁出前

1. 确认模块 `id`（kebab-case）与 `requires` 依赖（通常含 `rbac`）
2. 在 `apps/server/scripts/lib/module-manifest.ts` 追加静态 manifest 条目（顺序与 `requires` 须与运行时一致）
3. 若涉及 Prisma model，在 `apps/server/prisma/models/<id>.prisma` 添加，并在 `apps/server/scripts/lib/module-dependency-rules.ts` 的 `SCHEMA_FILE_OWNER` 登记归属
4. 紧耦合子域可同包：一个模块包内分子目录，不为目录整齐拆新包

## Server checklist

1. 创建 `modules/<id>/MODULE.md`
2. 实现 `ServerAppModule`：`shared.permissions`（如有 PBAC）、`server.registerRoutes`
3. 路由迁至 `modules/<id>/server/`，使用 `defineRoute` + `app.requirePermission`
4. 业务 service 放在模块 `server/src/`（勿留在宿主 `apps/server/src/`）
5. 写操作审计：优先 `events.emit('audit.log', ...)` 或领域事件；避免直接 import `AuditService`
6. 跨模块协作遵循 extension-points 决策表（Provider / EventBus，非跨包 service import）
7. 在 `apps/server/src/enabled-modules.ts` 注册（被依赖模块在前）
8. 从遗留路由聚合中删除引用
9. 更新 `module-manifest.ts` 与 `module-manifest.test.ts` 保持一致

## Client checklist

1. 在 `modules/<id>/client/` 实现 `module.tsx`
2. `renderRoutes` / `renderTenantRoutes` 或 `routes` + `nav`
3. 页面、hooks、lib、components 按 `frontend-page-structure` 四层拆分
4. 跨模块 UI：`shell.shellProviders` + slot（见 extension-points；slot 由消费方模块 `client/shell/` 定义）
5. 在 `apps/client/src/enabled-modules.ts` 注册
6. 从 `App.tsx` / 组装层删除硬编码项

## Prisma

- model 含 `tenant_id`；内核 `Tenant`/`User` **不**声明业务反向 relation
- 跨模块查询用 Provider / 事件 / 只读 `shared` 类型，避免 Prisma 跨包 relation（同物理包内可例外）

## 验证

```bash
pnpm --filter @be-water/builtin test
pnpm check:modules
pnpm check:deps
pnpm check
```

## 禁止

- 不要向 `kernel/` import 具体业务模块
- 不要直接向 `routes/index.ts` 追加业务路由
- 不要在 `App.tsx` 硬编码业务 `<Route>`
- 不要在 `platform` 内写业务域逻辑；用 slot / `renderPlatformRoutes` 反向贡献
