# @be-water/server

be-water 后端组装层：启动 Fastify 进程、合并 Prisma schema、注册已启用的业务模块。

## 职责

- 应用入口（`src/index.ts`）
- 模块注册表：`src/enabled-modules.ts`
- Prisma 主 schema 与 migration（`prisma/`）
- 运维脚本（`scripts/`）

内核能力（认证、模块加载、EventBus 等）在 `@be-water/server-kernel`；内置模块在 `@be-water/builtin`（`packages/builtin/<id>/server`）；外部业务模块是各自的包（`modules/<id>/`，如 `@be-water/note`），由 `pnpm gen:external-modules` 汇入 `src/external-modules.ts`。

## 常用命令

```bash
pnpm --filter server dev
pnpm --filter server build
pnpm --filter server exec prisma migrate dev --name <name>
pnpm --filter server exec prisma migrate deploy
pnpm --filter server test
pnpm --filter server validate:module-deps
```

## 相关文档

- [模块化架构](../../docs/design/modular-architecture.md)
- [部署](../../docs/deployment.md)
