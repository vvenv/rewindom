# background-job

用户可见的后台任务列表 API；各模块通过 `registerJobs` 向 `JobRegistry` 注册定时任务。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `server/` | 任务 API、`JobRegistry` 集成 |
| `client/` | `TaskContext`、任务进度 UI |

## 依赖

- kernel
- `module-rbac`

## 扩展点

- `server.registerJobs` — 注册 cron / interval handler

## 开发

```bash
pnpm --filter @be-water/modules test --project background-job/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
