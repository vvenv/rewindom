# module-user

## 用途

租户用户 CRUD、密码重置、角色分配。

## 租户侧入口

| 路径 | 页面 | 所需权限 |
| --- | --- | --- |
| `/users` | 用户列表、增删改、重置密码、分配角色 | `users.read`（写操作另需 `users.write`；分配角色需 `roles.assign`） |

导航项在 `client/shell/user-nav.ts`，与 `rbac` 的 `/roles` 同属「系统管理」分组。
角色**本身**的增删改在 `/roles`（`rbac` 模块），这里只做「把已有角色分配给某个用户」。

## 依赖

- `module-rbac`

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## API

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/users` | `users.read` |
| POST | `/api/users` | `users.write` |
| PATCH | `/api/users/:userId` | `users.write` |
| DELETE | `/api/users/:userId` | `users.delete` |

## 扩展点

- `client/src/shell/user-menu-slots.ts`：`userMenuUsageSlot` — 用户菜单用量卡注入点；提供方为 `module-be-water/settings`（`SettingsShellSlots`）。未注册时菜单不展示用量卡。

## 如何单独测试

```bash
pnpm --filter server exec vitest src/modules/user/user.routes.test.ts
```

## 禁止

- 不要在 kernel 路由文件追加用户 API；在本模块 `registerRoutes` 注册
