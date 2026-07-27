# module-notification

## 用途

租户站内通知 API 与 `createNotification` 发布接口。

## 依赖

- `module-rbac`

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/notifications` | 分页列表 |
| GET | `/api/notifications/unread-count` | 未读数 |
| PATCH | `/api/notifications/:notificationId/read` | 标记已读 |
| POST | `/api/notifications/read-all` | 全部已读 |

## 如何单独测试

```bash
pnpm --filter server exec vitest src/modules/notification/
```

## 禁止

- 不要在通用 hook 内直接 `prisma.notification.create`；使用 `notification.service`
