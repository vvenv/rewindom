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

两根正交的轴，注册表都在 `@rewindom/shared`：

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

## AI 配置（BYOK）

租户在工作台 `/app/settings` 填写 OpenAI 兼容 API Key、模型与温度。密钥 AES-GCM
加密进 `TenantSetting[openai_api_key].secret`，接口只回 `configured` + 尾部 hint。
运行时 `resolveLlmConfig(tenantId)`：本站覆盖 > 平台 `OPENAI_*` env。`OPENAI_BASE_URL`
不开放给租户。

权限：`settings.read` / `settings.write`。密钥表单在 Sheet 里，页上是状态行 + 模型表单。

| 方法 | 路径                    | 权限             |
| ---- | ----------------------- | ---------------- |
| GET  | `/api/settings/openai`  | `settings.read`  |
| PUT  | `/api/settings/openai`  | `settings.write` |

`PUT` 的 `api_key` 省略 = 不改；空串 = 清掉本站密钥、回落平台。`model` / `temperature`
显式 `null` 才是恢复继承。

## 数据备份与还原

整库级别（`pg_dump -Fc` / `pg_restore`），入口在平台运维侧栏「数据备份」（`/platform/backup`）。
备份与还原都是后台任务：接口只回 `job_id`，进度与下载按钮都在任务中心。

| 方法 | 路径                                          | 作用                             |
| ---- | --------------------------------------------- | -------------------------------- |
| POST | `/api/platform/database-backup`               | 发起整库备份任务                 |
| POST | `/api/platform/backup/jobs/:job_id/download-token` | 换一次性下载令牌            |
| GET  | `/api/platform/backup/jobs/:job_id/download`  | 下载 dump（可用令牌免登录）      |
| GET  | `/api/platform/restore/local-candidates`      | 列白名单目录下的可还原文件       |
| POST | `/api/platform/restore/local`                 | 用服务器上已有文件还原           |
| POST | `/api/platform/restore`                       | 上传 dump 文件还原（multipart）  |

- 任务标题前缀（`DATABASE_BACKUP_TASK_TITLE_PREFIX` / `DATABASE_RESTORE_TASK_TITLE_PREFIX`）
  决定任务中心是否给该任务显示下载按钮，改文案会连带影响那个判断
- 本地还原只接受 `DATABASE_RESTORE_LOCAL_PATHS` 白名单目录内的绝对路径，服务端用
  `realpath` 复核，防目录穿越
- 还原会先 `DROP SCHEMA public CASCADE`，因此前端强制走 `destructive` 二次确认
- 上传前只按 `.dump` 扩展名预检；最终以文件头魔数（`PGDMP`）为准

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
pnpm --filter @rewindom/builtin exec vitest --run --project 'platform/*'
```

## 禁止

- 不要在租户 route 使用 `requirePlatformAdmin`；平台 API 统一 `/api/platform/*`
