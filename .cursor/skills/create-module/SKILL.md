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

## 第 0 步：收集输入（缺项必须问，禁止猜）

生成前必须先拿到一份完整 spec。**模板：`templates/MODULE.spec.yaml`**（示例值取自 `notes`）。
用户已提供 spec → 校验必填项齐全后直接开工；未提供 → 按下表补齐再动手。

### 必问项（猜错要跨文件返工）

| 字段                                           | 影响面                                                                | 猜错的代价                                 |
| ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `kind` + `placement`                           | 进业务包子域 vs 新建 infra 包                                         | 物理布局整体推倒                           |
| `resource.singular/plural`                     | 20+ 文件名、URL、路径参数、queryKey                                   | 事后重命名成本最高                         |
| `surfaces`                                     | 是否生成 `platform-*.routes.ts` / `renderPlatformRoutes`              | 平台面漏建或白建                           |
| `entitlement.key` + `default_enabled`          | `registerTenantGatedRoutes` + `APP_TENANT_ENTITLEMENTS`               | **漏了等于绕过租户开关，是安全问题**       |
| `permissions[].key`                            | 后端 `requirePermission` + 前端 `hasPermission` + nav `anyPermission` | 字面不一致 → 权限静默失效                  |
| `models[].fields`                              | Prisma + mapper + 表单 + 表格列                                       | 唯一无法从模板推导的部分                   |
| `client.mount`                                 | 决定页面外壳（见 `frontend-page-structure`）                          | 租户页漏 `PageLayout` / 平台页多套一层标题 |
| `client.route_path` + `nav.{label,title,icon}` | 路由与导航                                                            | 漏 `title` → 移动端没有页面标题            |

### 追问节奏

一次最多 4 题，分两轮，不要 20 连问：

- **轮 1（骨架）**：`kind` + `placement` / `resource` 单复数 / `surfaces` / `client.mount`
- **轮 2（契约）**：`permissions` key 列表 / `models` 字段 / `entitlement` key + 默认开关 / `route_path` + nav 三件套

### 可默认项（直接采用，不要问；在最终回复里列出所用默认值）

| 项                  | 默认                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| 模型基础字段        | `id` + `tenant_id` + `created_at` + `updated_at`，索引含 `[tenant_id]`         |
| 列表                | 分页 20；服务端排序；`sort_whitelist` = 模型标量字段；默认按 `updated_at desc` |
| 审计                | 每个写操作一个 `<RESOURCE>_<ACTION>`，经 `events.emit` 上报                    |
| 测试                | `*.routes.test.ts` + client `lib/*.test.ts`                                    |
| 软删除 / 移动端 tab | 关                                                                             |

### 硬规则

- 必问项缺失且用户未回答 → **停，不生成**。禁止「先建着回头改」。
- 用户答案与仓库约定冲突（如 permission key 或字段名用 camelCase）→ 按 AGENTS.md「前置约束」先给最佳实践方案再确认。
- spec 落盘为 `packages/modules/<id>/MODULE.spec.yaml`；后续改需求走 **spec diff → 再生成**，保证幂等。

## 第 1 步：优先用脚手架生成

spec 齐了就**先跑生成器**，不要手写骨架：

```bash
node scripts/gen-module.mjs <spec.yaml> --dry-run   # 先看会动哪些文件
node scripts/gen-module.mjs <spec.yaml>             # 生成 + 装配 + 自动 prettier/eslint --fix
```

它产出 26 个文件并完成全部装配——**新模块要碰的注册表有 6 处，逐个手工加必漏**：

| 装配点                                                                 | 漏了会怎样                                  |
| ---------------------------------------------------------------------- | ------------------------------------------- |
| `apps/server/src/enabled-modules.ts`                                   | 路由不注册                                  |
| `apps/client/src/enabled-modules.ts`                                   | 页面与导航不出现                            |
| `apps/server/scripts/lib/module-manifest.ts`                           | `module-dependencies.test.ts` 红            |
| `packages/server-kernel/src/lib/tenant-guard.ts` 的 `MODEL_POLICIES`   | **Prisma client 启动即失败**（fail-closed） |
| `eslint-rules/tenant-models.json`                                      | 越权查询失去 lint 兜底                      |
| audit 的 `AuditAction` / `AUDIT_ACTION_LABELS` / `AUDIT_ACTION_GROUPS` | 审计标签变 `undefined`                      |

外加 `apps/server/prisma/models/<id>.prisma` 符号链接。

**支持范围**（超出会直接报错，不生成半对的代码）：`surfaces: [tenant]` +
`client.mount: renderRoutes` 的列表型 CRUD；表单字段支持 `String`（Input/Textarea）、
`Boolean`（Sheet 里 Switch、表格列 Checkbox 可就地切换）、`DateTime`（Popover + Calendar，
表单内以 ISO 串表示）；`search_fields` 只能是 String。平台面、非列表页、多模型等按下面的
checklist 手工建。

生成后要做的：

1. `node scripts/verify-module.mjs <id>`
2. `pnpm --filter server exec prisma migrate dev --name add_<id>`
3. 业务逻辑补在 `server/<resource>.service.ts`（生成的是标准 CRUD）
4. 改需求优先**改 spec 重新生成**（`--force`），而不是手工改生成物后让二者失配

## 模块分类

| 类型     | `kind`           | 原则                                                |
| -------- | ---------------- | --------------------------------------------------- |
| 通用模块 | `infrastructure` | SRP：一种横切能力一个包（`audit`、`notification`…） |
| 业务模块 | `business`       | 一个域一个包；包内拆 `tenant/` 与 `platform/` 两面  |

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
8. Prisma：`packages/modules/<id>/schema.prisma`，并在 `apps/server/prisma/models/<id>.prisma` 建**符号链接**指向它（`ln -s ../../../../packages/modules/<id>/schema.prisma`）；模型含 `tenant_id`；内核 `Tenant`/`User` 不声明业务反向 relation

## Client checklist

1. 业务 UI 放在 `packages/modules/<id>/client/`：
   - `pages/`、`hooks/`、`components/`、`lib/` 在 `client/` **根目录**（见 `notes`、`user`、`platform`）
   - `tenant/` — 只放租户侧装配：`routes.tsx` + `nav-sections.ts`
   - `platform/` — 只放平台侧装配：`routes.tsx` + `nav.ts`（导出 platformNav child）
   - `shell/` — 跨模块 slot 贡献
2. `client.renderRoutes`（或 `renderTenantRoutes`）→ 租户侧，挂载到 `AppLayout`
3. `client.renderPlatformRoutes`（如有）→ 平台侧，挂载到 `PlatformLayout`
4. 基础设施模块按挂载点注册：`renderGuestRoutes` / `renderSuperUserRoutes`
5. 跨模块 UI slot：通过 `shell.shellProviders` 注册 Provider
   - 平台控制台：`@be-water/modules/platform/client/shell/platform-widget-slots`
   - 用户菜单：`@be-water/modules/user/client/shell/user-menu-slots`
   - 业务自有 slot 在**消费方**模块的 `client/<subdomain>/shell/` 下定义
6. 平台导航角标：`shell.platformNavBadge` + `NavBadgeRegistryProvider`
7. 可选：`client.routes` 声明式路由（`renderAppRoutes` 自动套 `PermissionRoute`）
8. `client.nav` + 可选 `mobileTabPaths`（= spec 的 `options.mobile_tab`）
   - 只放**高频业务入口**；管理/配置类页面留给抽屉导航，别占底部 tab
   - 全站 tab 总数控制在 **5 个以内**，超出会挤成一行看不清
   - 路径必须是本模块 `nav` 里已有的 `path`，否则会被静默丢弃
   - 权限与 entitlement 过滤自动生效，无需在此重复声明
   - nav `label` / `title` 用 `namespace:key`（如 `note:nav.notes`），key 必须在模块 i18n 里真实存在，**禁止**模块加载时 `t()` 写死文案
9. Client i18n：`client/locales/{zh-CN,en}.json` + `client/i18n.ts` → `client.i18n`（**不要**往 `client-kit/locales` 塞模块 JSON）
10. Server i18n：`server/i18n.ts` 按稳定 **code** 提供 zh-CN/en → `server.i18n`；抛错用 `NotFoundError("notes.not_found")` 等，审计用 `detail_key` + `detail_params`（见 `docs/design/i18n.md`）
    - **租户无感知**：租户侧 locale / API `error` 兜底句 / 审计模板勿写「租户」「Tenant」（用 site / website / organization / 官网 / 组织）；平台侧可说租户（见 `tenancy-mode` rule、`tenant-config.md` §5.8）
11. Page 按 `frontend-page-structure` skill 四层拆分
12. 在 `apps/client/src/enabled-modules.ts` / `apps/server/src/enabled-modules.ts` 注册

## 金标准（notes）

- CRUD + `PermissionRoute` + 审计事件 + Vitest
- 服务与路由在 `packages/modules/notes/server/`；UI 在 `packages/modules/notes/client/tenant/`

## 禁止

- 在 `App.tsx` 硬编码业务路由
- 在 `routes/index.ts` 中央列表追加业务插件
- 在 `platform` 内写业务域逻辑；用 slot / `renderPlatformRoutes` 反向贡献

## 交付前自检（逐条比对 spec）

**先跑 `node scripts/verify-module.mjs <id>`**（`pnpm check:modules` 查全部）。
带 🤖 的条目它已经机器化——退出码非 0 就别说「做完了」；其余仍需人工核。

- [ ] 🤖 两个 `enabled-modules.ts` 都注册了：import **且**在 `ENABLED_*` 数组里
- [ ] 🤖 已加入 `apps/server/scripts/lib/module-manifest.ts` 的 `SERVER_MODULE_MANIFEST`
- [ ] 🤖 每个模型已在 `tenant-guard.ts` 的 `MODEL_POLICIES` 登记（漏了 Prisma client 启动即失败）
- [ ] 🤖 含 `tenant_id`/`tenant_slug` 的模型已登记 `eslint-rules/tenant-models.json`
- [ ] 🤖 `apps/server/prisma/models/<id>.prisma` 符号链接已建
- [ ] 🤖 `registerTenantGatedRoutes` 的 key 有 entitlement 声明，且 server/client manifest 都带 `tenantEntitlements`
- [ ] 🤖 用到的权限 key 都在某个 manifest 的 `shared.permissions` 里声明过
- [ ] 🤖 前端 `enableSorting` 的列 ⊆ 服务端 `*_SORTABLE_FIELDS`
- [ ] 🤖 写路由有审计事件；`AuditAction.*` 已在 `shared.auditActions` 声明（warn）
- [ ] 🤖 页面外壳与挂载点匹配（租户页有 `PageLayout`、平台页没有）
- [ ] 🤖 `AppNavSection` 每个导航项写了 `title`
- [ ] 权限 key 的**语义**分配合理（read/write 边界），非仅字面存在
- [ ] 服务查询都带 `tenant_id` 过滤（由 `eslint-rules/tenant-scope.js` 兜底）
- [ ] `MODULE.md` + `MODULE.spec.yaml` 落盘，且 spec 与实现一致
- [ ] 租户侧 / 公开面文案无「租户」「Tenant」（平台面除外）
