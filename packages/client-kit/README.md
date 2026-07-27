# @be-water/client-kit

前端 Shell 基建：通用组件、Hooks、路由守卫契约与列表页工具。

## 职责

| 类别 | 示例 |
| --- | --- |
| 布局 | `PageLayout`、`WorkbenchPageShell`、`KpiCard` |
| 表格 | `DataTable`、`Pagination`、`PageFilterBar` |
| 路由守卫 | `PermissionRoute`、`TenantModuleRoute`、`TenantEntitlementRoute` |
| 上下文 | `AuthContext`、`ConfirmContext` |
| Hooks | `useAuth`、`usePermissions`、`useTenantEntitlements`、`usePersistState` |
| 工具 | `list-url-params`、`resolve-app-home-path`、`module-contract` |

## 使用

```typescript
import { PageLayout, DataTable, useAuth } from "@be-water/client-kit";
import type { ClientAppModule } from "@be-water/client-kit";
```

业务模块 client 包应依赖本包，禁止 import 宿主 `apps/client/src/components`。

## 相关文档

- [前端 Page 分层](../../.cursor/skills/frontend-page-structure/SKILL.md)
