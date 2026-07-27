# module-platform

## 用途

平台管理员 API：租户管理、备份、系统用户等。审计/错误/慢查询的平台路由与 UI 已归属各自 infra 模块。

## 依赖

- kernel（`PLATFORM_ADMIN` 身份）
- `module-rbac`（部分租户侧能力）

## 启用

默认在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 中启用。

## 扩展点

- 路由聚合：`platform.routes.ts`（`routes/` 子路由按域拆分）
- 对外 guard / 类型：`guards/`、`lib/`
- 业务模块可通过 slot 向平台控制台注入自己的组件，`platform` 不反向依赖业务模块

## 目录结构（server）

```
server/src/
  module.ts              # ServerAppModule 注册
  platform.routes.ts     # /api/platform 路由聚合
  routes/                # admin / backup / settings / tenant / translate
  services/              # 业务服务
  guards/                # tenant-feature-guard、tenant-module-guard
  lib/                   # platform.types、limit-exceeded.*
  test/                  # 路由测试共享 mock / helper
```

## 如何单独测试

```bash
pnpm --filter server exec vitest src/modules/platform/
```

## 禁止

- 不要在租户 route 使用 `requirePlatformAdmin`；平台 API 统一 `/api/platform/*`
