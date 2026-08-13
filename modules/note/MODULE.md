# note

外部模块：租户内笔记 CRUD。

## 定位

- 独立 workspace 包（`modules/note/`），包名 `@rewindom/note`
- 所有内核 API 通过 `@rewindom/module-sdk` 门面包访问——不直接 import `server-kernel` / `client-kit` / `shared`
- 边界由 `verify-module.mjs` 的 `checkBoundary` 强制

## 结构

```
note/
├── package.json          # rewindom 字段声明 moduleId / prismaSchema / requires
├── tsconfig.json
├── vitest.config.ts      # server / client / shared 各一个 vitest project
├── prisma/schema.prisma  # Note 模型（tenant_id 隔离）
├── shared/
│   ├── note.ts           # API 类型契约
│   ├── entitlements.ts   # TenantModuleEntitlement 声明
│   └── index.ts
├── server/
│   ├── index.ts          # → re-export from module.ts
│   ├── module.ts         # ServerAppModule manifest（权限 / 审计 / 路由注册）
│   ├── note.routes.ts
│   ├── note.service.ts
│   ├── note.mapper.ts
│   ├── note.util.ts
│   └── i18n.ts
└── client/
    ├── module.tsx        # ClientAppModule manifest（路由 / nav / i18n）
    ├── tenant/
    │   ├── routes.tsx
    │   ├── nav-sections.ts
    │   └── dashboard-widgets.ts
    ├── pages/notes.tsx
    ├── components/        # NoteCard / NotesGrid / NoteCreateSheet / NoteEditSheet / NoteFilters / NotesDashboardWidget
    ├── hooks/             # useNote / useNotes / useNoteMutations / useNotesPage
    ├── lib/               # notes.ts / note-sort.ts
    ├── i18n.ts
    └── locales/{zh-CN,en}.json
```

## 面划分

| 面 | 路由 | 目录 | 所需权限 |
| --- | --- | --- | --- |
| 租户侧 | `/app/notes` | `client/tenant/` | `note.read`（写操作另需 `note.write`） |

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置 | 文件 | 收窄方式 |
| --- | --- | --- |
| 路由 | `server/note.routes.ts` | `app.requirePermission("note.read" / "note.write")` |
| 导航项 | `client/tenant/nav-sections.ts` | `anyPermission: ["note.read"]`；label 用 `note:nav.*` |
| 文案 | `client/locales/{zh-CN,en}.json` + `client/i18n.ts` | 挂到 `client.i18n`，勿放进 client-kit |
| 页面路由 | `client/tenant/routes.tsx` | `PermissionRoute permission="note.read"` |
| 页面内写操作 | `client/pages/notes.tsx`、`client/components/NotesGrid.tsx` | `usePermissions().hasPermission("note.write")` |

权限在 `server/module.ts` 的 `shared.permissions` 声明，由 `collectModulePermissions`
汇入权限目录，租户可在 `/app/roles` 勾选给角色。

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
pnpm --filter @rewindom/note test
```
