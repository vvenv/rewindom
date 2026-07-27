# audit

审计日志查询 API；通过 EventBus `audit.log` 事件写入（过渡期兼容显式 `AuditService` 调用）。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `server/` | 审计查询路由、EventBus 订阅 |
| `client/` | 审计日志列表 UI |

## 依赖

- kernel
- `module-rbac`

## 启用

默认在 `enabled-modules.ts` 中启用。

## API

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/audit-logs` | `users.read` |

## 开发

```bash
pnpm --filter @be-water/modules test --project audit/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
