# error-log

全局错误日志存储与平台/租户查询 API（`ErrorLog` model）。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `server/` | `ErrorService`、查询路由 |
| `client/` | 错误日志列表 UI |

## 依赖

- kernel
- `module-rbac`

## 启用

默认在 `enabled-modules.ts` 中启用。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/error-logs` | 租户侧错误日志列表 |

## 开发

```bash
pnpm --filter @be-water/modules test --project error-log/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
- [错误日志](../../../docs/design/error-logging.md)
