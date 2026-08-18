# module-slow-request

## 用途

慢请求日志采集、平台查询 API、定时清理任务。超过阈值（默认 500ms）的 HTTP 请求会缓冲写入 `SlowRequestLog`，用于定位接口瓶颈。与 `slow-query` 互补：后者看 SQL，本模块看整段请求。

## 依赖

- kernel
- `module-rbac`
- `module-background-job`（清理 job）

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

内核 `onResponse` 经 `setRequestTimingRecorder` 注入本模块的 `SlowRequestService.enqueue`，不在 kernel 里 import 本包。

## 扩展点

- `registerJobs` — 慢请求日志清理
- 平台慢请求路由：`platform-slow-request.routes.ts`（`/api/platform/slow-request-logs`）

## 配置

| env | 默认 | 说明 |
| --- | --- | --- |
| `SLOW_REQUEST_ENABLED` | `true` | 关闭慢请求日志采集 |
| `SLOW_REQUEST_THRESHOLD_MS` | `500` | 超过该耗时才落库 |
| `SLOW_REQUEST_BUFFER_SIZE` | `50` | 缓冲条数，满则立即 flush |
| `SLOW_REQUEST_FLUSH_INTERVAL_MS` | `2000` | 定时 flush |
| `SLOW_REQUEST_RETENTION_DAYS` | `14` | 自动清理保留天数 |

`/health` 与 CORS `OPTIONS` 不采集。响应头带 `X-Response-Time`。

## 如何单独测试

```bash
pnpm --filter @rewindom/builtin exec vitest --run --project 'slow-request/*'
```

## 禁止

- 不要在业务 service 内直接写 `SlowRequestLog`；使用 `slow-request.service` 封装
