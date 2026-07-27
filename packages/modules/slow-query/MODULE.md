# module-slow-query

## 用途

慢查询日志采集、平台查询 API、定时清理任务。

## 依赖

- kernel
- `module-rbac`
- `module-background-job`（清理 job）

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## 扩展点

- `registerJobs` — 慢查询日志清理
- 平台慢查询路由：`platform-slow-query.routes.ts`（`/api/platform/slow-query-logs`）

## 如何单独测试

```bash
pnpm --filter @be-water/modules test --project slow-query/server
```

## 禁止

- 不要在业务 service 内直接写 `SlowQueryLog`；使用 `slow-query.service` 封装
