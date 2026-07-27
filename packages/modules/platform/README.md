# platform

平台管理员：租户管理、备份、系统用户、审计/错误/慢查询平台视图等。

## 目录结构

| 路径      | 说明                       |
| --------- | -------------------------- |
| `server/` | `/api/platform/*` 路由聚合 |
| `client/` | 平台管理后台 UI            |

## 依赖

- kernel（`PLATFORM_ADMIN` 身份）
- `module-rbac`（部分租户侧能力）

## 启用

默认在 `enabled-modules.ts` 中启用。

## 开发

```bash
pnpm --filter @be-water/modules test --project platform/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
- [租户配置](../../../docs/design/tenant-config.md)
