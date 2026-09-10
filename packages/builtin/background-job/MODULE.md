# module-background-job

## 用途

两件事，别混：

1. **用户可见的后台任务**（导出、备份恢复）——`BackgroundJob` 表 + 任务中心 UI
2. **系统定时任务**——各模块通过 `registerJobs` 向内核 `JobRegistry` 声明节奏，
   本模块把注册表的运行态开给平台管理员看

## 依赖

- kernel
- `module-rbac`

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## 扩展点

- `server.registerJobs` — 声明 `schedules` + `run`，节奏由注册表持有
- Job 实现仍在 `packages/builtin/background-job/`（由路由与 worker 调用）

### 声明节奏，不要自己 setInterval

```ts
ctx.registry.register({
  id: "slow-query-cleanup",
  moduleId: "slow-query",
  label: "Slow query log cleanup",
  schedules: [
    { kind: "interval", every_ms: 30 * 60_000 }, // 另有 initial_delay_ms / run_on_start
    { kind: "daily", hour: 8, minute: 35 },
  ],
  run: () => SlowQueryService.cleanupOldLogs(days), // 抛出去就行，不用自己 catch
});
```

注册表负责：计时、重叠时跳过（而不是堆两轮）、计耗时、记成败、广播 `JobRunSample`。
`error-log` 订阅该广播，把失败写成 `job:<id>` 的 ErrorLog。

没有「一轮」概念的东西才用命令式 `start` / `stop`：进程事件监听器、停机前 flush
内存计数、关连接池。可与 `schedules` 并存。

## API

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/background-jobs` | 登录用户，只看自己的 |
| GET | `/api/platform/scheduled-jobs` | 平台管理员：定时任务运行态 |

## 页面

| 路径 | 挂载点 | 说明 |
| --- | --- | --- |
| 任务中心抽屉 | `shell.shellProviders` | 用户自己的导出 / 恢复任务 |
| `/platform` | `platformDashboardSections` | 定时任务运行态（order 8） |

## 如何单独测试

```bash
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter @rewindom/builtin exec vitest --run --project 'background-job/*'
```

## 禁止

- 不要在 `scheduler.service.ts` 直接 import 业务模块；通过 `JobRegistry` 注册
- 不要在 `registerJobs` 里自己 `setInterval` / 手抄 `scheduleDailyAt`：那样运行态就
  只存在于日志里，平台页看不见，五个模块也会各写一份不一样的重叠保护
- 不要把 `/api/platform/scheduled-jobs` 的数字当集群视角：运行态是**进程内存**，
  多实例部署时每个实例只认得自己那一份，重启即清零
- 不要把定时任务运行态接到租户面
