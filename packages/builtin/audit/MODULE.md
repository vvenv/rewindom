# module-audit

## 用途

审计日志查询 API 与页面（租户侧 + 平台侧）；**写入只通过 EventBus 的 `audit.log` 事件**。

## 依赖

- kernel
- `module-rbac`

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## 权限

| Key | 说明 |
| --- | --- |
| `audit_logs.read` | 查看**本租户**审计日志；没有该权限的成员只能看到自己的记录 |

## API

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/audit-logs` | 登录即可；有 `audit_logs.read` 看本租户全量，否则强制只返回本人 |
| GET | `/api/platform/audit-logs` | 平台管理员（跨租户） |

租户侧刻意**不做 403**：该接口同时承担「我的操作记录」，403 会让普通成员连自己的记录都取不到。
可见范围收窄发生在 handler 内（`app.hasPermission`），无权限时请求里的 `user_id` / `username` 一律忽略。

## 页面

| 路径 | 挂载点 | 说明 |
| --- | --- | --- |
| `/app/audit-logs` | `renderRoutes`（租户） | 需 `audit_logs.read`，导航同步隐藏；不显示租户列与租户筛选 |
| `/platform/audit-logs` | `renderPlatformRoutes` | 跨租户只读，含租户列与租户筛选 |

## 如何单独测试

```bash
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter @be-water/builtin exec vitest --run --project 'audit/*'
```

## 禁止

- 不要在未启用本模块时写入 `AuditLog`（应通过 EventBus 或 no-op）
- 不要从模块外直接调用 `AuditService.log()`：写入一律用
  `emitAuditLogFromRequestSafe`（有 request）或 `emitDetachedAuditLogSafe`（后台任务）。
  直接调用会让调用方依赖 module-audit，且绕开未启用本模块时的 no-op 语义
- 租户侧查询必须带当前 `tenant_slug` 精确匹配，并带 `scope: AuditScope.TENANT`——平台操作与代登录会话不该出现在租户视图；禁止把 `tenant_slug IS NULL` 算进任一租户（含 default）

- 不要仅凭 `useTenantFilter()` 非空就渲染租户下拉：`TenantFilterProvider` 挂在
  `ShellProviders` 上，租户 `AppLayout` 也在其作用域内，必须由调用方显式开启
