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
| GET | `/api/error-logs` | 租户侧列表（非系统管理员仅见本人） |
| GET | `/api/error-logs/stats` | 租户侧统计（`error_logs.read`） |
| DELETE | `/api/error-logs/cleanup` | 清理租户历史日志（`error_logs.manage`） |
| DELETE | `/api/error-logs/cleanup/my` | 清理本人历史日志 |
| DELETE | `/api/error-logs/:id` | 删除单条 |
| GET | `/api/platform/error-logs` | 平台管理员（跨租户） |
| GET | `/api/platform/error-logs/stats` | 平台管理员统计 |

## 如何单独测试

```bash
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter modules exec vitest --run --project 'error-log/*'
```

## 禁止

- 不要在业务 route 中绕过 `error-handler` 中间件静默吞错
