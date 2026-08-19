# 请求性能（慢请求）

模块：`packages/builtin/slow-request/`

Fastify 根实例上的 `onResponse` 采集 HTTP 耗时，超过阈值落库，提供平台查询、按路由统计与定时清理。与慢查询（`slow-query`）、错误日志（`error-log`）同属可观测性基础设施。

## 数据模型

### SlowRequestLog

```prisma
model SlowRequestLog {
  id          String   @id @default(uuid())
  duration_ms Int
  status_code Int
  route       String
  path        String?
  method      String
  tenant_slug String?
  user_id     String?
  username    String?
  request_id  String?
  source      String   @default("http")
  created_at  DateTime @default(now())

  @@index([created_at])
  @@index([duration_ms])
  @@index([route])
  @@index([tenant_slug])
  @@index([status_code])
}
```

| 字段 | 说明 |
| --- | --- |
| `route` | Fastify 路由模板（如 `/api/notes/:noteId`），用于聚合 |
| `path` | 实际路径（去 query，最长 500 字符） |
| `request_id` | 与 `SlowQueryLog.request_id` 对齐，可对照同一次请求里的慢 SQL |
| `tenant_slug` | 可空；平台会话或租户上下文尚未建立时为 `null` |

**没有外键关系**：与 `ErrorLog` / `SlowQueryLog` 相同，日志在用户删除后仍保留。租户过滤靠精确匹配 `tenant_slug`。

## 采集

内核 `request-timing.middleware.ts` 在根 app 上注册 hook（必须在根实例，封装插件里的 hook 看不到兄弟模块路由）：

1. `onRequest` 记下开始时间
2. `onSend` 写 `X-Response-Time`
3. `onResponse` 调用 `setRequestTimingRecorder` 注入的回调

组装层 `server-assembly.ts` 把回调接到 `SlowRequestService.enqueue`。未达阈值、`/health`、`OPTIONS` 不入队。缓冲 + 定时 flush，写入失败只打 warn，不阻塞响应。

## API

```
GET /api/slow-request-logs
GET /api/slow-request-logs/stats
GET /api/platform/slow-request-logs
GET /api/platform/slow-request-logs/stats
```

列表查询：`route`、`method`、`min_duration_ms`、`status_code`、`tenant_slug`（仅平台）、`start_date`、`end_date`、`sort_by`、`sort_dir`。

统计返回 `total_count` / `avg_duration_ms` / `p95_duration_ms` / `duration_max` / `by_route`。百分位在最近 1000 条慢请求样本上计算，不是全站流量的无偏 P95。

## 前端

平台 `/platform/slow-request-logs`：可筛选列表。统计卡片与最慢路由图在监控页 `/platform`（本模块 `platformDashboardSections`）。无租户工作台页（与 `slow-query` 相同）。

## 配置

见模块 `MODULE.md`。生产 compose 不透传这些键（与 `SLOW_QUERY_*` 一样走代码默认）；要改阈值在容器环境里显式加入即可。
