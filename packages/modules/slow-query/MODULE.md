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
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter modules exec vitest --run --project 'slow-query/*'
```

## 禁止

- 不要在业务 service 内直接写 `SlowQueryLog`；使用 `slow-query.service` 封装
