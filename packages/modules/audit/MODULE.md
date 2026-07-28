# module-audit

## 用途

审计日志查询 API；通过 EventBus `audit.log` 事件写入（过渡期兼容显式 `AuditService` 调用）。

## 依赖

- kernel
- `module-rbac`

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## API

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/audit-logs` | `users.read`（租户侧审计查询） |
| GET | `/api/platform/audit-logs` | 平台管理员（跨租户） |

## 如何单独测试

```bash
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter modules exec vitest --run --project 'audit/*'
```

## 禁止

- 不要在未启用本模块时写入 `AuditLog`（应通过 EventBus 或 no-op）
