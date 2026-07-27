# module-background-job

## 用途

用户可见的后台任务列表 API；各模块通过 `registerJobs` 向 `JobRegistry` 注册定时任务。

## 依赖

- kernel
- `module-rbac`

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## 扩展点

- `server.registerJobs` — 注册 cron / interval handler
- Job 实现仍在 `modules/background-job/`（由路由与 worker 调用）

## 如何单独测试

```bash
pnpm --filter server exec vitest src/modules/background-job/ src/kernel/job-registry.test.ts
```

## 禁止

- 不要在 `scheduler.service.ts` 直接 import 业务模块；通过 `JobRegistry` 注册
