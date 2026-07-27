---
name: error-logging
description: ErrorLog 模型、ErrorService、全局 error-handler、查询 API。开发错误日志页或服务端可观测性时使用。
---

# 错误日志

设计文档：`docs/design/error-logging.md`

## 数据

`ErrorLog`：`level`, `message`, `stack_trace`, `user_id`, `username`, `route`, `method`, `error_code`, `context`（JSON 字符串）, `created_at`

## 服务

- `ErrorService.logError` / `logWarning` / …
- `getErrorLogs` / `getErrorStats` / `cleanupOldLogs`
- 中间件 `error-handler.ts`：未捕获异常写入 DB

## API

```
GET  /api/error-logs?page=&page_size=&level=&user_id=&route=&error_code=&start_date=&end_date=
GET  /api/error-logs/stats
DELETE /api/error-logs/cleanup
```

- 普通用户仅能看自己的日志；`SUPERUSER` 可按 `user_id` 筛选
- 查询参数一律 **snake_case**（含 `user_id`）

## 前端

- 页面 `ErrorLogs.tsx` + `ErrorLogFilters`
- URL 与 API 同名：`user_id`, `error_code`, `start_date`, `page_size`
