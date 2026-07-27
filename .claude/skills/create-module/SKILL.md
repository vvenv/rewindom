---
name: create-module
description: 按模块化架构创建新的 server/client 业务模块。新增功能域、CRUD 模块或从遗留路由拆出时使用。
---

# 创建业务模块

Rule：`.cursor/rules/extension-points.mdc`（含跨模块通信决策表）  
设计文档：`docs/design/modular-architecture.md`（§3.4、§9.4、§10.5、§11.4）

## 何时使用

- 新增 **Shell** 横切能力（审计、通知等独立 infra 包 — 慎增，优先现有 Shell）
- 新增 **业务** 功能 → 业务包的 `<subdomain>/` 子域（见 `docs/design/modular-architecture.md` §11.2）
- 金标准示例模块（`notes`）

## 模块分类

| 类型 | `kind` | 原则 |
| --- | --- | --- |
| 通用模块 | `infrastructure` | SRP：一种横切能力一个包（`audit`、`notification`…） |
| 业务模块 | `business` | 一个域一个包；包内拆 `tenant/` 与 `platform/` 两面 |

纯租户侧业务（如 `notes`）只需 `tenant/`；兼有平台管理面的域额外加 `platform/`。

## 物理包（业务单包）

产品**业务**收敛为单包。新业务功能放进业务包 `packages/<product>/<subdomain>/`，**不要**新建 `module-<feature>`。当前仓库只有 `notes` 一个业务模块。

子域为包内目录，**不再各自导出 manifest**——整包只有一个 `productServerModule` / `productClientModule`。新子域的做法：

1. 建 `server/<subdomain>/`、`client/<subdomain>/`、`shared/<subdomain>/` 目录
2. 若需租户开关：在 `shared/<subdomain>/entitlements.ts` 导出 `TenantModuleEntitlement`，并加入 `shared/entitlements.ts` 的 `APP_TENANT_ENTITLEMENTS`
3. 在 `server/module.ts` 的 `registerRoutes` 追加注册（租户路由用 `registerTenantGatedRoutes(app, "<entitlement-key>", …)`）
4. 在 `client/module.tsx` 追加 `renderRoutes` / `nav` / `shell` 贡献

参考 `packages/modules/notes/` 与 `docs/design/modular-architecture.md` §11.2。

## Server checklist

1. 复制 `packages/modules/notes/`（金标准）为 `packages/modules/<id>/`，改写 `package.json` 与 `MODULE.md`
2. 实现 `ServerAppModule`（`id`, `version`, `label`, `kind`, `requires?`, `server.registerRoutes`）
3. 租户路由：`*.routes.ts`，前缀 `/api`，`defineRoute` + `app.requirePermission`
4. 平台路由（如有）：`platform-*.routes.ts`，注册到 `/api/platform`，`requirePlatformAdmin`
5. 域类型放在 `packages/modules/<id>/shared/`；`entitlements.ts` 声明租户功能 slice
6. 写操作审计：优先 `events.emit('audit.log', ...)` 或 `events.emit('<resource>.<action>', ...)`；避免新业务直接 import `AuditService`
7. 在 `apps/server/src/enabled-modules.ts` 注册 `@be-water/modules/<id>/server/index.js`
8. Prisma：`packages/modules/<id>/prisma/<id>.prisma`；含 `tenant_id`；内核 `Tenant`/`User` 不声明业务反向 relation

## Client checklist

1. 业务 UI 放在 `packages/modules/<id>/client/`：
   - `tenant/` — 租户侧 pages、hooks、`*Routes.tsx`、`nav`
   - `platform/` — 平台侧 pages、hooks、`routes.tsx`、`nav.ts`（导出 platformNav child）
2. `client.renderRoutes`（或 `renderTenantRoutes`）→ 租户侧，挂载到 `AppLayout`
3. `client.renderPlatformRoutes`（如有）→ 平台侧，挂载到 `PlatformLayout`
4. 基础设施模块按挂载点注册：`renderGuestRoutes` / `renderSuperUserRoutes`
5. 跨模块 UI slot：通过 `shell.shellProviders` 注册 Provider
   - 平台控制台：`@be-water/modules/platform/client/shell/platform-widget-slots`
   - 用户菜单：`@be-water/modules/user/client/shell/user-menu-slots`
   - 业务自有 slot 在**消费方**模块的 `client/<subdomain>/shell/` 下定义
6. 平台导航角标：`shell.platformNavBadge` + `NavBadgeRegistryProvider`
7. 可选：`client.routes` 声明式路由（`renderAppRoutes` 自动套 `PermissionRoute`）
8. `client.nav` + 可选 `mobileTabPaths`
9. Page 按 `frontend-page-structure` skill 四层拆分
10. 在 `apps/client/src/enabled-modules.ts` 注册 `module.tsx`

## 金标准（notes）

- CRUD + `PermissionRoute` + 审计事件 + Vitest
- 服务与路由在 `packages/modules/notes/server/`；UI 在 `packages/modules/notes/client/tenant/`

## 禁止

- 在 `App.tsx` 硬编码业务路由
- 在 `routes/index.ts` 中央列表追加业务插件
- 在 `platform` 内写业务域逻辑；用 slot / `renderPlatformRoutes` 反向贡献
