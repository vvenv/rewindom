# 租户功能开关与配额（Tenant Features & Limits）

相关：[tenant-config.md](./tenant-config.md) · [permission-system.md](./permission-system.md)

> 与代码冲突时以 **代码 + Prisma schema** 为准。

---

## 1. 结论

平台通过两类 **TenantSetting JSON** 控制 SaaS 套餐，与租户内 RBAC、租户 BYOK 配置正交：

| 维度 | 管理者 | 存储 key | 语义 | 示例 |
| --- | --- | --- | --- | --- |
| **功能开关** | 平台管理员 | `tenant_features` | 有没有这个模块 | `notes` 模块是否开通 |
| **用量配额** | 平台管理员 | `tenant_limits` | 能用多少 | 用户数上限 |
| **用户权限** | 租户 SUPERUSER | `UserPermission` | 谁能操作 | `notes.write`、`users.write` |
| **租户配置** | 租户 SUPERUSER | 各业务 key | 怎么配集成 | LLM API Key（BYOK） |

**生效规则**：

- 功能：开关 **且** 权限同时满足 → 可用；开关关闭 → API `403` + `FEATURE_DISABLED`，前端隐藏入口
- 配额：写操作或资源创建前校验；超限 → `403` + `LIMIT_EXCEEDED`（附 `limit_key`、当前值）

**设计原则**：

1. **显式 DB 值优先**：解析逻辑只做「读 JSON → 缺省用注册表默认」
2. **存量靠迁移脚本**：凡影响已有租户行为的变更，发版时附带一次性脚本写入显式值
3. **boolean 与 numeric 分离**：`tenant_features` / `tenant_limits` 各一套注册表，不混在一个对象里
4. **不新增表**：继续用 `TenantSetting`

---

## 2. 功能开关（tenant_features）

### 2.1 注册表

功能开关有两个来源：

1. **模块自带的开关** — 各模块在 manifest 的 `tenantEntitlements` 中声明，加载时由
   `collectTenantCatalogFromManifests` 合并进租户目录。样板见
   `packages/modules/notes/shared/entitlements.ts`：

   ```typescript
   export const NOTES_ENTITLEMENT: TenantModuleEntitlement = {
     key: "notes",
     label: "笔记",
     description: "租户内笔记管理（示例模块）",
     disabled_hint: "该租户未开通笔记模块",
     default_enabled: true,
   };
   ```

2. **套餐级 feature flag** — 定义在 `packages/modules/platform/shared/pricing-plans.ts`
   的 `TenantFeatureFlags` 中，跨模块共享。

> ⚠️ `pricing-plans.ts` 中现存的 `chat` / `advanced_analysis` / `vector_search` /
> `bulk_import` / `custom_reports` 等 key 继承自本仓库的前身产品，对应的业务模块已经移除。
> 新建模块请走上面第 1 种方式（模块自带 entitlement），不要往这组遗留 key 里加东西。

### 2.2 功能映射

模块自带的 entitlement 由 `registerTenantGatedRoutes(app, "<key>", …)` 在路由注册时统一守卫，
未开通则整组路由不挂载。示例见 `packages/modules/notes/server/module.ts`。

跨模块的 feature flag 用 `createTenantFeaturePreHandler("<flag>")` 做路由级守卫。

读接口通常不受开关影响，是否放行由各模块自行决定。

### 2.3 守卫点示例

```typescript
// 整组路由 — 模块自带 entitlement（未开通则不挂载）
await registerTenantGatedRoutes(app, "notes", async (scoped) => {
  await scoped.register(noteRoutes, { prefix: "/api/notes" });
});

// 单条路由 — 套餐级 feature flag
preHandler: [
  app.requirePermission("notes.write"),
  createTenantFeaturePreHandler("<flag>"),
];

// 服务层 — 优雅降级而非 403
const enabled = await isTenantFeatureEnabled(tenantId, "<flag>");
```

---

## 3. 用量配额（tenant_limits）

### 3.1 注册表

```typescript
// packages/modules/platform/shared/pricing-plans.ts
export type TenantLimitKey =
  | "max_users"
  | "max_documents"
  | "max_products"
  | "max_analyses_per_month"
  | "analyses_per_day";

export interface TenantLimitDefinition {
  key: TenantLimitKey;
  label: string;
  description: string;
  /** 未配置时的默认值；null 表示不限制 */
  default_value: number | null;
  min: number;
}

// packages/modules/platform/shared/tenant-limits.ts
export const TENANT_LIMIT_REGISTRY = {
  max_users: {
    key: "max_users",
    label: "用户数上限",
    description: "租户内登录用户数量（不含代登录影子账号）",
    default_value: null,
    min: 1,
  },
  // …其余 key 见源文件
} satisfies Record<TenantLimitKey, TenantLimitDefinition>;
```

`null` = 不限制（适合大客户）；新建 SaaS 租户由平台在创建后设具体数字。

> ⚠️ 该注册表中除 `max_users` 外的 key（`max_documents`、`max_products`、
> `max_analyses_per_month`、`analyses_per_day`）继承自本仓库的前身产品，对应模块已移除。
> 新增配额请按自己的业务域定义 key，不要复用这几个。

### 3.2 校验点

配额在**写入落库前**校验：统计租户当前用量，超限拒绝。
校验点由持有该资源的模块自己实现——底座只提供注册表、读取与平台管理端 UI。

超限响应：

```typescript
{
  error: "已达用户数上限（10），请联系平台管理员",
  code: "LIMIT_EXCEEDED",
  limit_key: "max_users"
}
```

---

## 4. 存量迁移（一次性脚本）

### 4.1 backfill-tenant-features

```
对每个 status != SUSPENDED 的租户：
  读取 tenant_features（无则 {}）
  对每个新增的 feature key：
    若 merged.<key> 未定义：
      merged.<key> = <该 key 在注册表中的 default>
  upsert tenant_features
```

> 凡影响已有租户行为的开关变更，发版时都要配一次性 backfill 写入**显式值**，
> 否则改注册表默认值会静默改变存量租户的行为。

### 4.2 backfill-tenant-limits

```
对每个 status != SUSPENDED 的租户：
  若尚无 tenant_limits 行：
    写入 {}  // 全部落注册表 default_value（多数为 null = 不限制）
```

### 4.3 部署顺序

```text
prisma migrate deploy
node apps/server/scripts/backfill-tenant-features.mjs
node apps/server/scripts/backfill-tenant-limits.mjs
pm2 reload / 发版
```

---

## 5. API 设计

### 5.1 平台侧

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/platform/tenants/:id/entitlements` | `{ modules, features }` |
| PUT | `/api/platform/tenants/:id/entitlements` | 部分更新；审计 `TENANT_ENTITLEMENTS_UPDATE` |
| GET | `/api/platform/tenants/:id/limits` | `{ limits }` |
| PUT | `/api/platform/tenants/:id/limits` | 部分更新；审计 `TENANT_LIMITS_UPDATE` |

### 5.2 租户侧（只读）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/settings/tenant-features` | `authenticate` | `{ features }` |
| GET | `/api/settings/tenant-limits` | `authenticate` | `{ limits }` |
| GET | `/api/settings/usage` | `authenticate` | 当前用量与限额详情 |

---

## 6. 权限与角色

| 角色 | 功能关闭 | 配额已满 |
| --- | --- | --- |
| USER | 无菜单 / API 403 | 操作 403 |
| SUPERUSER | **不**绕过功能开关 | **不**绕过配额 |
| 平台管理员 | 功能 Dialog | 配额 Dialog |

---

## 7. 前端设计

### 7.1 Hooks

- `useTenantFeatures` → `GET /settings/tenant-features`
- `useTenantLimits` → `GET /settings/tenant-limits`
- `useUsage` → `GET /settings/usage`

### 7.2 导航过滤

`navConfig` 子项增加 `tenant_feature?: TenantFeatureKey`；`AppLayout` 在权限过滤后再按功能开关过滤。

### 7.3 平台控制台

| 组件 | 职责 |
| --- | --- |
| `PlatformTenantFeaturesDialog` | 按 `TENANT_FEATURE_REGISTRY` 渲染 Switch |
| `PlatformTenantLimitsDialog` | 按 `TENANT_LIMIT_REGISTRY` 渲染数字输入；空 = 使用默认 |

### 7.4 用量展示卡片

在「系统设置」页面增加「当前套餐与用量」区域：

```
┌─────────────────────────────────────┐
│  当前套餐：免费版                    │
│                                     │
│  用户数      ███░░░░░░░   3/10      │
│  <业务配额>  ██░░░░░░░░   8/20      │
│                                     │
│  [ 升级到专业版 ]                   │
└─────────────────────────────────────┘
```

- 进度条颜色：< 70% 绿色，70%~90% 橙色，≥ 90% 红色
- 达到 100% 时显示「已达上限」+ 操作按钮置灰

---

## 8. 审计

| Action | 场景 |
| --- | --- |
| `TENANT_FEATURES_UPDATE` | 平台修改功能开关 |
| `TENANT_LIMITS_UPDATE` | 平台修改配额 |

---

## 9. 实施清单

### Phase A — 功能开关

- [x] entitlement 由模块 manifest 声明并汇总为租户目录
- [x] `tenant-entitlement.service.ts` 实现
- [x] `GET /api/settings/tenant-entitlements`
- [x] 后端守卫点（`registerTenantGatedRoutes` / `createTenantFeaturePreHandler`）
- [x] 前端导航过滤、`TenantModuleRoute` / `TenantEntitlementRoute`

### Phase B — 用量配额

- [x] `TENANT_LIMIT_REGISTRY` 定义（`packages/modules/platform/shared`）
- [ ] `tenant-limit.service.ts` 实现
- [ ] `scripts/backfill-tenant-limits.mjs`
- [ ] 平台 `GET/PUT /tenants/:id/limits` + Dialog
- [ ] 所有校验点拦截实现
- [ ] `GET /api/settings/usage` + 前端用量展示
