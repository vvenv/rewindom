# be-water

多租户 SaaS 底座 monorepo（`apps/server` + `apps/client` + `packages/*`）。

## 前置约束

对于用户提出的每一个要求，必须先评估是否为最佳实践：

- **如果是最佳实践**：直接执行
- **如果不是最佳实践**：给出最佳实践方案，并询问用户应采纳哪种方案

## 约定速查

- API 响应：`{ data: T }` / `{ error: string }`
- 字段命名：DB/API/类型/列表 URL 用 `snake_case`；路由 path 参数用 camelCase（`field-naming` rule）
- 前端请求：必须用 `@/lib/api`，禁止直接 `fetch`
- React 组件：具名导出
- 写操作：记录审计日志
- Migration：禁止随意 `reset`，优先增量 migration

## 模块化开发

架构设计：`docs/design/modular-architecture.md`。Rule：`extension-points`（含跨模块通信决策表、Slot 与物理包策略摘要）。

| 注册表            | 路径                                             |
| ----------------- | ------------------------------------------------ |
| Server 启用模块   | `apps/server/src/enabled-modules.ts`（infra → shell → 业务域） |
| Client 启用模块   | `apps/client/src/enabled-modules.ts`             |
| 内核路由          | `packages/server-kernel/src/kernel/kernel-routes.ts` |
| App Shell（前端） | `packages/client-kit/` + `apps/client/src/app-shell-routes.tsx` |

新功能：创建 `packages/modules/<name>/` + `MODULE.md`，在 `enabled-modules.ts` 注册。Skill：`create-module`。

## 模块包布局

业务模块为独立 workspace 包 `packages/modules/<id>/`（`shared` + `server` + `client` + 可选 `prisma`）。`apps/server` / `apps/client` 为极薄组装层。

## 维护模式

本仓库**独立维护**：不作为可 fork 的上游模板，也不从任何上游 `git merge`。
提改动方案时**不要**以「会与上游冲突」或「先进上游再同步」为由——那套约束已作废。

内核与基础设施仍**不得**依赖业务模块，但理由是单向依赖分层，不是合并成本。

## 命令

```bash
pnpm dev | build | start
pnpm --filter server exec prisma migrate dev --name <name>
pnpm --filter server exec prisma migrate deploy
```

## 设计文档（docs/）

完整索引见 [docs/README.md](docs/README.md)。Agent 通过 **Rules + Skills** 内化，无需每次 `@docs`。

| 领域              | 文档                                        | Skill / Rule                      |
| ----------------- | ------------------------------------------- | --------------------------------- |
| 模块化 / 插件化   | `design/modular-architecture.md`            | `create-module`、`extract-module` |
| 字段命名          | `design/field-naming-conventions.md`        | `field-naming`                    |
| 权限              | `design/permission-system.md`               | `permissions`                     |
| 错误日志 / 可观测 | `design/error-logging.md`                   | `error-logging`                   |
| 租户配置 / 用户   | `design/tenant-config.md`、`design/user-system.md` | —                          |
| 租户功能开关/配额 | `design/tenant-features.md`                 | —                                 |
| 前端 Page 分层    | —                                           | `frontend-page-structure`         |
| 单元测试          | `design/unit-testing.md`                    | —                                 |
| 部署 / FAQ        | `deployment.md`、`faq.md`                   | —                                 |

## Cursor 配置

- **Rules**（`.cursor/rules/*.mdc`）— `architecture`、`extension-points`、`coding-standards`、`field-naming`、`permissions`、`docs-reference`、`ui-components`、`frontend-page-structure`、`audit-logging`、`prisma-migration`、`plan-tracking`、`auto-execute-scripts`
- **Skills**（`.cursor/skills/`）— `create-module`、`extract-module`、`error-logging`、`frontend-page-structure`、`prisma-sync-fix`、`merge-migrations`
