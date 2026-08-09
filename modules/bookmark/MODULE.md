# bookmark

外部模块：租户内书签（网址收藏）管理。

## 定位

- 独立 workspace 包（`modules/bookmark/`），包名 `@be-water/bookmark`
- 所有内核 API 通过 `@be-water/module-sdk` 门面包访问——不直接 import `server-kernel` / `client-kit` / `shared`
- 边界由 `verify-module.mjs` 的 `checkBoundary` 强制

## 结构

```
bookmark/
├── package.json          # beWater 字段声明 moduleId / prismaSchema / requires
├── tsconfig.json
├── vitest.config.ts      # server / client / shared 各一个 vitest project
├── prisma/schema.prisma  # Bookmark 模型（tenant_id 隔离）
├── shared/
│   ├── bookmark.ts       # API 类型契约
│   ├── entitlements.ts   # TenantModuleEntitlement 声明
│   └── index.ts
├── server/
│   ├── index.ts          # → re-export from module.ts
│   ├── module.ts         # ServerAppModule manifest（权限 / 审计 / 路由注册）
│   ├── bookmark.routes.ts
│   ├── bookmark.service.ts
│   ├── bookmark.mapper.ts
│   ├── bookmark.util.ts
│   └── i18n.ts
└── client/
    ├── module.tsx        # ClientAppModule manifest（路由 / nav / i18n / 工作台卡片）
    ├── tenant/
    │   ├── routes.tsx
    │   ├── nav-sections.ts
    │   └── dashboard-widgets.ts
    ├── pages/bookmarks.tsx
    ├── components/        # BookmarkCard / BookmarksGrid / BookmarkFilters /
    │                      # BookmarkCreateSheet / BookmarkEditSheet /
    │                      # BookmarkFormFields / BookmarksDashboardWidget
    ├── hooks/             # useBookmark / useBookmarks / useBookmarkMutations /
    │                      # useBookmarksPage / useCopyBookmarkLink
    ├── lib/               # bookmarks.ts / bookmark-sort.ts
    ├── i18n.ts
    └── locales/{zh-CN,en}.json
```

## 面划分

| 面 | 路由 | 目录 | 所需权限 |
| --- | --- | --- | --- |
| 租户侧 | `/app/bookmarks` | `client/tenant/` | `bookmark.read`（写操作另需 `bookmark.write`） |

## API

前缀 `/api/bookmarks`，全部经 `registerTenantGatedRoutes` 做模块开关 + 租户隔离。

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/` | `bookmark.read` | 列表。`page` / `page_size` / `q` / `host` / `sort_by` / `sort_dir` |
| GET | `/hosts` | `bookmark.read` | 站点分组（筛选栏 chips），按条数降序取前 30 |
| GET | `/:bookmark_id` | `bookmark.read` | 详情（编辑时取完整 description） |
| POST | `/` | `bookmark.write` | 创建。`title` 可留空，服务端用主机名兜底 |
| PATCH | `/:bookmark_id` | `bookmark.write` | 局部更新 |
| DELETE | `/:bookmark_id` | `bookmark.write` | 删除 |

`sort_by` 白名单：`updated_at`（默认）/ `created_at` / `title` / `host`；
与 `client/lib/bookmark-sort.ts` 的 `BOOKMARK_SORT_FIELDS` 一一对应，改一侧要同步另一侧。

## URL 规范化

`server/bookmark.util.ts` 的 `normalizeBookmarkUrl` 是唯一口径，
`client/lib/bookmarks.ts` 有一份同口径副本（前端要即时算出主机名做 placeholder）：

- 缺 scheme 自动补 `https://`——用户多半只会粘 `example.com`
- 只收 `http:` / `https:`；`javascript:` / `data:` 一类直接拒（否则书签就是个 XSS 跳板）
- 落库时把主机名（去 `www.`）冗余进 `host` 列，供列表筛选与卡片展示，避免每次现算

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置 | 文件 | 收窄方式 |
| --- | --- | --- |
| 路由 | `server/bookmark.routes.ts` | `app.requirePermission("bookmark.read" / "bookmark.write")` |
| 导航项 | `client/tenant/nav-sections.ts` | `anyPermission: ["bookmark.read"]`；label 用 `bookmark:nav.*` |
| 文案 | `client/locales/{zh-CN,en}.json` + `client/i18n.ts` | 挂到 `client.i18n`，勿放进 client-kit |
| 页面路由 | `client/tenant/routes.tsx` | `PermissionRoute permission="bookmark.read"` |
| 页面内写操作 | `client/pages/bookmarks.tsx`、`client/components/BookmarksGrid.tsx` | `usePermissions().hasPermission("bookmark.write")` |

权限在 `server/module.ts` 的 `shared.permissions` 声明，由 `collectModulePermissions`
汇入权限目录，租户可在 `/app/roles` 勾选给角色。

## 审计动作

外部模块不能 import 内部模块的 `AuditAction` 枚举，直接用字符串字面量，
与 manifest 的 `auditActions` 声明保持一致：`BOOKMARK_CREATE` / `BOOKMARK_UPDATE` / `BOOKMARK_DELETE`。

## 依赖

- `rbac`
- `audit`

## 接入流程

```bash
# 1. 装依赖
pnpm install

# 2. 生成注册表 + Prisma 符号链接 + 租户登记
pnpm gen:external-modules

# 3. 重新生成 Prisma client
pnpm --filter server exec prisma generate

# 4. 生成迁移
pnpm --filter server exec prisma migrate dev --name <name>

# 5. 校验
pnpm check:modules   # 模块契约 + 边界
```

## 如何单独测试

```bash
pnpm --filter @be-water/bookmark test
```
