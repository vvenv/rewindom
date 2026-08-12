# @be-water/client

be-water 前端组装层：Vite + React SPA，聚合各模块 UI 与 App Shell 路由。

## 职责

- 应用入口与全局样式（`src/main.tsx`、`src/App.tsx`、`src/index.css`）
- 模块注册表：`src/enabled-modules.ts`
- 路由组装：`src/app-shell-routes.tsx`、`src/render-app-routes.tsx`、`src/declarative-routes.tsx`
- 组装层导航契约：`src/app-nav.ts`

内置模块前端在 `@be-water/builtin/<id>/client`；外部业务模块是各自的包（`modules/<id>/`，如 `@be-water/note`），由 `pnpm gen:external-modules` 汇入 `src/external-modules.ts`。通用基建在 `@be-water/client-kit`、`@be-water/ui`，产品壳层在 `src/shell/`。

## 常用命令

```bash
pnpm --filter client dev
pnpm --filter client build
pnpm --filter client typecheck
pnpm --filter client test
```

## 相关文档

- [模块化架构](../../docs/design/modular-architecture.md)
