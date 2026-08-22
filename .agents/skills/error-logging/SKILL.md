---
name: error-logging
description: ErrorLog 模型、ErrorService、全局 error-handler、查询 API。开发错误日志页或服务端可观测性时使用。
---

# 错误日志

设计文档：`docs/design/error-logging.md`　模块：`packages/builtin/error-log/`

## 数据

`ErrorLog`：`id`, `level`(`error`/`warn`/`info`/`debug` 字符串，非 enum), `message`, `stack_trace`,
`user_id`, `username`, `tenant_slug`, `route`, `method`, `ip_address`, `user_agent`,
`error_code`, `created_at`，外加四个 **jsonb** 列：`request_body`, `request_params`, `request_query`, `context`。

- jsonb 列传/收**纯 JSON 值**，两侧都不要再 `JSON.stringify` / `JSON.parse`；共享类型 `JsonValue | null`
- 只有 `request_body` 有 GIN 索引（`jsonb_path_ops`，支持 `@>`，不支持 `?` 键存在）
- 无外键关系，租户隔离靠 `tenant_slug` 字符串过滤（默认租户兼容 `NULL`）

## 服务

`ErrorService` 是**静态类**：`log` / `logError`(第一参是 `Error` 对象) / `logWarning` / `logInfo` / `logDebug`；
`getErrorLogs` / `getErrorLogsCount` / `getErrorLogById` / `getErrorStats` / `cleanupOldLogs` / `deleteErrorLog`。
没有 `logFatal`。

内核中间件 `error-handler.middleware.ts` 不 import 业务模块，靠 `setErrorLogWriter()` 注入写入函数。

## API

```
GET    /api/error-logs?page=&page_size=&level=&user_id=&q=&start_date=&end_date=&sort_by=&sort_dir=
GET    /api/error-logs/stats                 # 权限 error_logs.read
DELETE /api/error-logs/cleanup?days=30       # 权限 error_logs.manage，记审计
DELETE /api/error-logs/cleanup/my?days=30    # 记审计
DELETE /api/error-logs/:id                   # 记审计
```

- 列表返回 `{ data: { items, page, page_size, total, page_count } }`（偏移分页）
- 非系统管理员强制只看/只删自己的日志；`user_id` 参数仅系统管理员生效
- 搜索参数是 `q`（覆盖 `username`/`route`/`error_code`），**没有** `route=` / `error_code=` 独立参数
- 查询参数与响应键一律 **snake_case**（`/stats` 返回 `by_level` / `by_route` / `by_error_code`）

## 前端

- `pages/error-logs.tsx` + `ErrorLogsTable` / `ErrorLogFilters` / `ErrorLogSheet`
- 详情抽屉里四个 jsonb 字段由 `JsonField` 统一渲染，值为 `null` 时整块不显示
- URL 与 API 同名：`user_id`, `q`, `start_date`, `page_size`

## 注意

- 目前**没有自动清理任务**，`ERROR_LOG_RETENTION_DAYS` 未被读取；要补就照抄 `slow-query/server/scheduler-jobs.ts`
- `request_body` 可能含敏感信息，用 `ERROR_LOG_INCLUDE_REQUEST_BODY=false` 关闭采集
