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

## 外观（主题 + 布局）

两根正交的轴，注册表都在 `@be-water/shared`：

- **主题**（配色方案）— `theme-palette.ts`，token 在 `apps/client/src/index.css`
- **布局**（左右 / 上下）— `shell-layout.ts`，渲染在 `apps/client/src/shell/`

本模块只负责「默认值存哪、谁能改」。每根轴各自三级优先，越靠近用户越优先：

| 层级 | 存储                                                                    | 改的地方                 |
| ---- | ----------------------------------------------------------------------- | ------------------------ |
| 用户 | `localStorage: theme-palette` / `shell-layout`                          | 租户侧栏的两个切换按钮   |
| 租户 | `TenantSetting[appearance].{theme,layout}`（`null`=继承）               | 平台控制台 → 租户 → 外观 |
| 平台 | `AppSetting[platform_settings].{default_theme,default_layout}`          | 平台控制台 → 平台设置    |

| 方法 | 路径                                   | 身份       |
| ---- | -------------------------------------- | ---------- |
| GET  | `/api/settings/appearance`             | 租户用户   |
| GET  | `/api/platform/tenants/:id/appearance` | 平台管理员 |
| PUT  | `/api/platform/tenants/:id/appearance` | 平台管理员 |

`PUT` 的两个字段都可选：只传 `theme` 就只改主题，`layout` 保持原值；显式传 `null` 才是恢复继承。

**新增一个配色**：`THEME_PALETTES` 追加一项 + `index.css` 补 light/dark 两个 token 块。
**新增一种布局**：`SHELL_LAYOUTS` 追加一项 + 在 `AppShellFrame` 加一个分支。
两处配置 UI 都从注册表渲染，本模块无需改动。

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
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter modules exec vitest --run --project 'platform/*'
```

## 禁止

- 不要在租户 route 使用 `requirePlatformAdmin`；平台 API 统一 `/api/platform/*`
