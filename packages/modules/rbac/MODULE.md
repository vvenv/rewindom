# module-rbac

## 用途

租户内 PBAC 权限：路由 `requirePermission`、权限 API、权限缓存、`PbacAuthzProvider`，以及租户侧的**角色权限管理页**。

## 租户侧入口

| 路径 | 页面 | 所需权限 |
| --- | --- | --- |
| `/roles` | 角色列表、增删改、按 group 勾选权限 | `roles.read`（写操作另需 `roles.write`） |

导航项在 `client/shell/rbac-nav.ts`，归入「系统管理」分组——与 `user` 模块的
`/users` 同组（`collectModuleNav` 按 section label 合并）。两者都挂在
`SuperUserRoute` 下，并各自用 `PermissionRoute` 收窄到具体权限。

给成员**分配**角色不在这里，而在 `/users` 的用户行内（`user` 模块的
`UserPermissionSheet`，需 `roles.assign`）——角色的定义与角色的分配分属两个页面。

## 系统管理员默认全权限

`is_system_admin` 的主体**无条件拥有其作用域内的全部权限**，不需要也不应该给它分配角色
（`PUT /users/:id/roles` 对系统管理员直接报错）。两侧对称：

| 侧 | 主体 | 拿到的权限 |
| --- | --- | --- |
| 租户侧 | `tenant_user` 且 `is_system_admin` | `catalog.tenantPermissionKeys` 全集 |
| 平台侧 | `platform_admin` 且 `is_system_admin` | `catalog.platformPermissionKeys` 全集 |

实现分布在三处，改其一要同步看另外两处：

- 服务端判定：`PbacAuthzProvider.check` / `checkAny` 直接短路放行（`api_key` 同）
- 服务端权限清单：`resolveTenantUserPermissions` / `resolvePlatformAdminPermissions` 返回目录全集
- 客户端判定：`@be-water/shared` 的 `hasPermission` / `hasAnyPermission` / `hasAllPermissions`
  以 `isSystemAdmin` 为第一参数短路，`RbacPermissionProvider` 从 `useAuth().user` 取该标志

平台管理员的权限集同样经 `GET /api/auth/permissions` 下发——该路径必须留在
`auth.middleware.ts` 的 `PLATFORM_ALLOWED_PREFIXES` 里，否则非系统管理员的平台管理员
会因为拿不到权限清单而被前端 `PermissionRoute` 弹回首页。

## 依赖

- kernel

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。未启用时内核使用 `AuthenticatedOnlyAuthz`。

## 扩展点

- Server `AuthzProvider`：`PbacAuthzProvider`（`registerMiddleware` 注册）
- Client `PermissionsProvider`：`RbacPermissionProvider`（`client.shell.shellProviders` 注入）
- 权限目录：各模块 `shared.permissions` 合并（见 `collect-module-permissions.ts`）

业务模块只 import `@be-water/client-kit` 的 `usePermissions` / `PermissionRoute`；权限管理 UI hooks（`usePermissionCatalog` 等）从 `@be-water/modules/rbac/client` 引入。

## 如何单独测试

```bash
pnpm --filter server exec vitest src/modules/rbac/permission.routes.test.ts
```

## 禁止

- 不要在路由中直接查 `UserPermission`；使用 `app.requirePermission`
- 新业务权限在模块 `shared.permissions` manifest 声明，由 `collectModulePermissions` 聚合；不要向 `@be-water/shared` 追加权限常量
