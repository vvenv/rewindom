# be-water

**Agent-first** 多租户 SaaS 底座 monorepo（`apps/server` + `apps/client` + `packages/*`）。

编码 Agent 的默认入口即本文件：约定、模块闭环与 Skills/Rules 索引。产品口径与成功标准见
[`docs/design/agent-first.md`](docs/design/agent-first.md)。

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
- 单租户部署：`SINGLE_TENANT=true`（见 `tenancy-mode` rule）；生产 env 透传门禁：`pnpm check:prod-app-env`
- 租户无感知：租户侧 / 公开面文案不出现「租户」「Tenant」（见 `tenancy-mode` rule、`tenant-config.md` §5.8）

## 模块化开发

架构设计：`docs/design/modular-architecture.md`。Rule：`extension-points`（含跨模块通信决策表、Slot 与物理包策略摘要）。

| 注册表            | 路径                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| Server 启用模块   | `apps/server/src/enabled-modules.ts`（infra → shell → 业务域）                |
| Client 启用模块   | `apps/client/src/enabled-modules.ts`                                          |
| 官网（租户 CMS）  | `packages/modules/marketing/`（主域=默认租户 SSR；平台控制台见 `PLATFORM_URL`） |
| 工作台卡片        | 各模块 `client.dashboardWidgets` → `packages/modules/dashboard` 聚合渲染      |
| 登录落地页        | `apps/client/src/home-path-candidates.ts`（默认 `/app/dashboard`；入口统一走 `/app`） |
| 内核路由          | `packages/server-kernel/src/kernel/kernel-routes.ts`                          |
| App Shell（前端） | `packages/client-kit/` + `apps/client/src/app-shell-routes.tsx`               |

新功能：创建 `packages/modules/<name>/` + `MODULE.md`，在 `enabled-modules.ts` 注册。Skill：`create-module`。

## 模块包布局

业务模块为独立 workspace 包 `packages/modules/<id>/`（`shared` + `server` + `client` + 可选 `prisma`）。`apps/server` / `apps/client` 为极薄组装层。

## 维护模式

本仓库**独立维护**：不作为可 fork 的上游模板，也不从任何上游 `git merge`。
提改动方案时**不要**以「会与上游冲突」或「先进上游再同步」为由——那套约束已作废。

内核与基础设施仍**不得**依赖业务模块，但理由是单向依赖分层，不是合并成本。

## Host 分流（本地与生产同构）

同一个进程按 **Host** 分流，不是按路径。本地 `localhost` 与 `127.0.0.1` 是**两个入口**：

| Host                              | 是什么         | 入口                                      |
| --------------------------------- | -------------- | ----------------------------------------- |
| `FRONTEND_URL`（本地 `localhost`）| 产品站=默认租户 | `/` 官网、`/app` 工作台、`/member/*` 会员 |
| `PLATFORM_URL`（本地 `127.0.0.1`）| 平台控制台     | `/platform`（未登录转 `/login`）          |
| `custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}` | 租户站点 | 同产品站                        |

租户 Host 上访问 `/platform` 会被送去 `PLATFORM_URL`；控制台 Host 上访问 `/` 会被送去
`/platform`。详见 [README](./README.md#从哪个地址进本地) 与
[tenant-config.md](docs/design/tenant-config.md)。

### 租户路由一律挂在 `/app/*` 之下

新模块的 `renderRoutes` / `nav.path` / `mobileTabPaths` **必须**用 `/app/<模块>` 前缀
（如 `/app/site`、`/app/notes`）。原因是租户 Host 上 `/` 归租户 CMS，应用区靠一级路径
前缀区分，而那份前缀表在 `SITE_APP_PREFIXES`、nginx location、vite dev 代理里各有一份。
每个模块各占一个顶层路径时，三份表都得跟着长——`/site`、`/dashboard`、`/audit-logs`
就是这么漏掉的，在绑定域上一直返回 404。收进 `/app/*` 后三处都只需要一个 `app`，
新增模块不必再碰它们，顶层 slug 也还给了租户站点。

## 命令

```bash
pnpm dev | build | start
pnpm --filter server exec prisma migrate dev --name <name>
pnpm --filter server exec prisma migrate deploy
pnpm gen:module <spec.yaml>     # 由 MODULE.spec.yaml 生成模块骨架（含两处注册表 + 审计动作 + 符号链接）
pnpm check:modules              # 模块契约校验（注册表/租户列/开关/权限/排序/外壳/nav）
node scripts/verify-module.mjs <id>   # 只查单个模块
```

新建模块的标准路径：**填 spec → `gen:module` → 补 service 业务逻辑 → `check:modules`**。
spec 模板在 `.cursor/skills/create-module/templates/MODULE.spec.yaml`；
`check:modules` 是 `create-module` skill「交付前自检」的机器化版本，改动模块后必须跑。

## 设计文档（docs/）

完整索引见 [docs/README.md](docs/README.md)。Agent 通过 **Rules + Skills** 内化，无需每次 `@docs`。

| 领域              | 文档                                               | Skill / Rule                      |
| ----------------- | -------------------------------------------------- | --------------------------------- |
| Agent-first       | `design/agent-first.md`                            | Skills + 本文件                   |
| 模块化 / 插件化   | `design/modular-architecture.md`                   | `create-module`、`extract-module` |
| 字段命名          | `design/field-naming-conventions.md`               | `field-naming`                    |
| 权限              | `design/permission-system.md`                      | `permissions`                     |
| 错误日志 / 可观测 | `design/error-logging.md`                          | `error-logging`                   |
| 租户配置 / 用户   | `design/tenant-config.md`、`design/user-system.md` | `tenancy-mode` rule               |
| 多语言（i18n）    | `design/i18n.md`                                   | —                                 |
| 租户功能开关/配额 | `design/tenant-features.md`                        | —                                 |
| 前端 Page 分层    | —                                                  | `frontend-page-structure`         |
| 官网 / SEO        | `packages/modules/marketing/MODULE.md`             | —                                 |
| 产品仓升级检查    | `design/downstream-fork.md`                        | `frontend-page-structure`         |
| 单元测试          | `design/unit-testing.md`                           | —                                 |
| 部署 / FAQ        | `deployment.md`、`faq.md`                          | —                                 |
| 租户自定义域名    | `custom-domain.md`（设计：`tenant-config.md` §5.9） | —                                 |

## Agent 配置（Cursor + Claude Code）

- **Rules**（`.cursor/rules/*.mdc`，仅 Cursor）— `architecture`、`extension-points`、`coding-standards`、`field-naming`、`permissions`、`docs-reference`、`tenancy-mode`、`ui-components`、`frontend-page-structure`、`audit-logging`、`prisma-migration`、`plan-tracking`、`auto-execute-scripts`
- **Skills**（`.cursor/skills/`，单一真相源）— `create-module`、`extract-module`、`error-logging`、`frontend-page-structure`、`prisma-sync-fix`、`merge-migrations`
- **Claude Code**：根目录 `CLAUDE.md` 指向本文件；`.claude/skills/` 由 `pnpm sync-skills` 生成（`prepare` 自动跑）；只改 `.cursor/skills/`，勿手改生成物
