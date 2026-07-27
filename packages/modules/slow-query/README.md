# slow-query

慢查询日志采集、平台查询 API、定时清理任务。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `server/` | 慢查询服务、平台路由、清理 job |
| `client/` | 平台慢查询 UI |

## 依赖

- kernel
- `module-rbac`
- `module-background-job`（清理 job）

## 扩展点

- `registerJobs` — 慢查询日志清理

## 开发

```bash
pnpm --filter @be-water/modules test --project slow-query/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
