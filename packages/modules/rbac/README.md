# rbac

租户内 PBAC 权限：路由 `requirePermission`、权限 API、权限缓存、`PbacAuthzProvider`。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `shared/` | 权限目录 manifest |
| `server/` | 权限路由、`PbacAuthzProvider`、缓存 |
| `client/` | 权限相关 UI（如有） |

## 依赖

- kernel

## 启用

默认在 `enabled-modules.ts` 中启用。未启用时内核使用 `AuthenticatedOnlyAuthz`。

## 扩展点

- `AuthzProvider`：`PbacAuthzProvider`（`registerMiddleware` 注册）
- 权限目录：各模块 `shared.permissions` 合并（见 `collect-module-permissions.ts`）

## 开发

```bash
pnpm --filter @be-water/modules test --project rbac/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
- [权限系统](../../../docs/design/permission-system.md)
