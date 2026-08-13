# 权限系统

## 概述

Rewindom 采用 **标准 RBAC + PBAC** 模型：

- **用户 → 角色 → 权限**（`UserRole` / `RolePermission`）
- 权限目录由各模块 `shared.permissions` 声明，内核聚合
- 租户权限与平台权限通过 `scope: tenant | platform` 区分

实现归属：`module-rbac`（`PbacAuthzProvider`、`requirePermission`、角色 API）。

## 管理员类型

| 类型 | 标识 | 默认权限 |
| --- | --- | --- |
| 租户系统管理员 | `User.is_system_admin = true` | 全部租户 scope 权限 |
| 租户普通管理员 | 分配租户 scope 角色 | 角色并集 |
| 平台系统管理员 | `PlatformAdmin.is_system_admin = true` | 全部平台 scope 权限 |
| 平台普通管理员 | 分配平台 scope 角色 | 角色并集 |

> 已移除 `User.role` 枚举（`USER` / `SUPERUSER` / `PLATFORM_ADMIN`）。

## 数据模型

```prisma
model Role {
  scope     String   // tenant | platform
  tenant_id String?  // 租户角色必填；平台角色为 null
  ...
  role_permissions RolePermission[]
  user_roles       UserRole[]
}

model User {
  is_system_admin Boolean @default(false)
  user_roles      UserRole[]
}
```

平台管理员独立表 `PlatformAdmin`，支持 `PlatformAdminRole` 关联。

## JWT

```json
{
  "userId": "user_123",
  "actor_type": "tenant_user",
  "is_system_admin": false,
  "tenant_id": "tenant_456",
  "tenant_slug": "acme"
}
```

平台管理员：`actor_type: "platform_admin"`，无 `tenant_id`。

## 权限格式

`{resource}.{action}`，模块 manifest 中可声明 `scope`（默认 `tenant`）。

## 角色管理 API（租户）

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/roles` | `roles.read` |
| POST | `/api/roles` | `roles.write` |
| PUT | `/api/roles/:id` | `roles.write` |
| DELETE | `/api/roles/:id` | `roles.write` |
| GET | `/api/users/:id/roles` | `roles.assign` |
| PUT | `/api/users/:id/roles` | `roles.assign` |

## 内置角色

租户创建时自动 seed：

- **成员**：无默认权限
- **管理员**：全部租户权限

平台启动时 seed：

- **平台管理员**：全部平台权限

## 平台管理员 API

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/platform/admins` | `platform.admins.read` |
| POST | `/api/platform/admins` | `platform.admins.write` |
| PATCH | `/api/platform/admins/:id` | `platform.admins.write` |
| DELETE | `/api/platform/admins/:id` | `platform.admins.write` |
| POST | `/api/platform/admins/:id/reset-password` | `platform.admins.write` |
| GET | `/api/platform/admins/:id/roles` | `platform.admins.assign` |
| PUT | `/api/platform/admins/:id/roles` | `platform.admins.assign` |
| GET | `/api/platform/roles` | `platform.roles.read` |
| POST | `/api/platform/roles` | `platform.roles.write` |
| PUT | `/api/platform/roles/:id` | `platform.roles.write` |
| DELETE | `/api/platform/roles/:id` | `platform.roles.write` |
| GET | `/api/platform/permissions/catalog` | `platform.roles.read` |

平台管理 UI：`/platform/admins`（导航「权限 → 平台管理员」）。

## 前端

- `usePermissions`：`is_system_admin` 为 true 时等价于拥有全部权限
- 用户管理：分配 `is_system_admin` 或角色列表
- 平台路由守卫：`actor_type === "platform_admin"`；管理员页额外要求 `platform.admins.read`
