# module-notes

## 用途

租户内笔记 CRUD 金标准示例模块。

## 面划分

| 面 | 路由 | 目录 | 所需权限 |
| --- | --- | --- | --- |
| 租户侧 | `/notes` | `client/src/tenant/` | `notes.read`（写操作另需 `notes.write`） |

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置 | 文件 | 收窄方式 |
| --- | --- | --- |
| 路由 | `server/note.routes.ts` | `app.requirePermission("notes.read" / "notes.write")` |
| 导航项 | `client/tenant/nav-sections.ts` | `anyPermission: ["notes.read"]`；label 用 `notes:nav.*` |
| 文案 | `client/locales/{zh-CN,en}.json` + `client/i18n.ts` | 挂到 `client.i18n`，勿放进 client-kit |
| 页面路由 | `client/tenant/routes.tsx` | `PermissionRoute permission="notes.read"` |
| 页面内写操作 | `client/pages/notes.tsx`、`client/components/NotesGrid.tsx` | `usePermissions().hasPermission("notes.write")` |

权限在 `server/module.ts` 的 `shared.permissions` 声明，由 `collectModulePermissions`
汇入权限目录，租户可在 `/roles` 勾选给角色。

导航的权限维度是 fail-closed（权限未加载时先隐藏），与 `tenantEntitlements`
的 fail-open 是两个独立维度：前者是**当前用户**有没有权限，后者是**租户**开没开通模块。

## 依赖

- `module-rbac`
- `module-audit`

## 启用

在 [enabled-modules.ts](../../../apps/server/src/enabled-modules.ts) 注册。

## 如何单独测试

```bash
# 每个模块的 server / client / shared 各是一个 vitest project，
# 位置参数只按 project root 的相对路径过滤，跑全模块要用 --project。
pnpm --filter modules exec vitest --run --project 'notes/*'
```
