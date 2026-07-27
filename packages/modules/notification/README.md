# notification

租户站内通知 API 与 `createNotification` 发布接口。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `server/` | 通知 CRUD、`notification.service` |
| `client/` | 通知铃铛、列表 UI |

## 依赖

- `module-rbac`

## 启用

默认在 `enabled-modules.ts` 中启用。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/notifications` | 分页列表 |
| GET | `/api/notifications/unread-count` | 未读数 |
| PATCH | `/api/notifications/:notificationId/read` | 标记已读 |
| POST | `/api/notifications/read-all` | 全部已读 |

## 开发

```bash
pnpm --filter @be-water/modules test --project notification/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
