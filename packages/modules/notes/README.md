# notes

租户内笔记 CRUD；模块化架构金标准示例（Prisma、`defineRoute` + PBAC、审计、前端四层拆分）。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `shared/` | 类型、权限 manifest、租户权益 |
| `server/` | 路由、Service、Mapper |
| `client/` | 页面、组件、Hooks、`NotesRoutes` |
| `prisma/` | `Note` model 片段 |

## 依赖

- `module-rbac` — `notes.read` / `notes.write`
- `module-audit` — 写操作审计

## 启用

在 `apps/server/src/enabled-modules.ts` 与 `apps/client/src/enabled-modules.ts` 中注册（saas-kit 与 be-water 均默认启用）。

## 开发

```bash
pnpm --filter @be-water/modules test --project notes/server
```

## 相关文档

- [MODULE.md](./MODULE.md)
