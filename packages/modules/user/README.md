# user

租户用户 CRUD、密码重置、权限勾选 API。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `server/` | 用户路由、Service |
| `client/` | 用户管理页面与组件 |

## 依赖

- `module-rbac`

## 启用

默认在 `enabled-modules.ts` 中启用。

## API

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/users` | `users.read` |
| POST | `/api/users` | `users.write` |
| PATCH | `/api/users/:userId` | `users.write` |
| DELETE | `/api/users/:userId` | `users.delete` |

## 开发

```bash
pnpm --filter @be-water/modules test --project user/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
- [用户系统](../../../docs/design/user-system.md)
