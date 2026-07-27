# module-error-log

## 用途

全局错误日志存储与平台/租户查询 API（`ErrorLog` model）。

## 依赖

- kernel
- `module-rbac`

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/error-logs` | 租户侧错误日志列表 |
| GET | `/api/platform/error-logs` | 平台管理员（跨租户） |
| GET | `/api/platform/error-logs/stats` | 平台管理员统计 |

## 如何单独测试

```bash
pnpm --filter server exec vitest src/modules/error-log/error-log.routes.test.ts src/modules/error-log/error.service.test.ts
```

## 禁止

- 不要在业务 route 中绕过 `error-handler` 中间件静默吞错
