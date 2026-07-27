<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
  <img src="docs/assets/logo.svg" width="88" height="88" alt="be-water">
</picture>

# be-water

**多租户 SaaS 底座 — 模块化 Monolith**

水无定形，遇器成形。底座随业务成形，而不是业务迁就底座。

</div>

---

## 这是什么

一个**多租户 SaaS 模块化单体**：内核 + 一组基础设施模块 + 一个金标准示例业务模块。

内核与基础设施**不含任何业务领域代码**；业务以模块形式挂载，`notes` 作为示例模块供复制起步。

**内置模块**（`packages/modules/`）：

| 模块             | 职责                                      |
| ---------------- | ----------------------------------------- |
| `user`           | 用户、认证、JWT 双 Token、登录失败锁定    |
| `platform`       | 平台管理端：租户、套餐、配额、平台设置    |
| `rbac`           | PBAC 权限；未启用时退化为「登录即可访问」 |
| `audit`          | 审计日志与查询 API                        |
| `notification`   | 站内通知、未读计数、桌面通知              |
| `background-job` | BullMQ 任务、任务中心 UI                  |
| `error-log`      | 错误日志采集与平台侧查询页                |
| `slow-query`     | 慢查询记录与平台侧查询页                  |
| `notes`          | **示例业务模块**——新模块的复制起点        |

**不是什么**：不是脚手架生成器（没有 `create-xxx` 命令），不是微服务框架，不是低代码平台。

---

## 快速开始

前置：Node.js 22+、pnpm 11+、Docker。

```bash
git clone <repo-url> && cd be-water
pnpm install
pnpm setup    # 幂等：生成 .env.local + 起 Postgres/Redis + 跑 migration
pnpm dev
```

- 前端 `http://localhost:5175`（Vite HMR）
- API `http://localhost:3400`（`/api` 由 Vite 代理，前端无需跨域配置）

`pnpm setup` 可重复执行。若只想起数据库：`pnpm db:up`。

---

## 架构

**模块化 Monolith**：编译期组装、单进程部署。业务按域拆成模块，每个模块自带 server 路由、client 页面、shared 契约与 `MODULE.md`。

三条硬约束：

1. **内核不依赖业务**——内核只有 HTTP 栈、认证身份、租户上下文、模块加载与事件总线
2. **模块间禁止直接 import**——跨模块协作走 manifest `requires` + Event Bus / Provider / Slot
3. **模块可按租户开关**——未开通的模块不挂载路由、不进侧边栏

这三条由工具强制，不靠自觉：`check-circular-deps`（包层环）、`validate-module-dependencies`（manifest 是否覆盖真实 import 与 schema FK）、`import-x/no-cycle`（文件级环）。`pnpm check:deps` 一次跑完。

新增模块用 `create-module` skill，或直接复制 `packages/modules/notes/`。

详见 [modular-architecture.md](docs/design/modular-architecture.md)。

---

## 技术栈

| 层次   | 技术                                              |
| ------ | ------------------------------------------------- |
| 后端   | Fastify 5 + TypeScript 6 + Prisma 7               |
| 数据库 | PostgreSQL 16 + Redis 7                           |
| 队列   | BullMQ                                            |
| 前端   | React 19 + Vite 8 + React Router v8               |
| UI     | shadcn/ui + Tailwind CSS 4 + TanStack Query/Table |
| 认证   | JWT 双 Token（access + refresh）                  |
| LLM    | OpenAI 兼容接口（可选，默认指向 DeepSeek）        |
| 部署   | Docker Compose（生产）+ 宿主机热更新（开发）      |

---

## 目录结构

```
be-water/
├── apps/
│   ├── server/              # Fastify 组装层 + Prisma schema/migrations
│   │   └── src/enabled-modules.ts
│   └── client/              # React 组装层 + 产品壳层（登录页、Layout、Sidebar）
│       └── src/enabled-modules.ts
├── packages/
│   ├── modules/             # 业务与基础设施模块（server + client + shared 成对）
│   ├── server-kernel/       # 内核：HTTP、认证、ModuleLoader、ProviderRegistry、EventBus
│   ├── client-kit/          # 前端模块契约、api 封装、守卫、Slot 机制
│   ├── shared/              # 跨端类型与工具
│   ├── ui/                  # shadcn/ui 基础组件
│   └── server-test/         # 测试装配（另有 client-test）
├── docker/                  # 生产 Dockerfile、Nginx、entrypoint
├── docs/                    # 设计文档
└── scripts/                 # 部署与运维脚本
```

两个 `enabled-modules.ts` 是唯一的模块注册表——加载什么、不加载什么，只看这两个文件。

---

## 常用命令

| 命令                             | 说明                                           |
| -------------------------------- | ---------------------------------------------- |
| `pnpm setup`                     | 本地开发初始化（幂等）                         |
| `pnpm dev`                       | 启动前后端 dev server                          |
| `pnpm db:up` / `db:down`         | 启停本地 Postgres + Redis                      |
| `pnpm docker:stack:up`           | 本地跑生产 Docker 栈（需 `.env.docker.local`） |
| `pnpm build` / `pnpm start`      | 构建 / 生产模式启动                            |
| `pnpm test` / `pnpm check`       | 测试 / lint + test                             |
| `pnpm check:deps`                | 模块边界与循环依赖校验                         |
| `pnpm db:studio`                 | Prisma Studio                                  |
| `pnpm bootstrap` / `pnpm deploy` | 远程首次部署 / 更新                            |
| `pnpm release`                   | 发版                                           |

---

## 环境变量

复制 `.env.example` → `.env.local`，至少配置：

| 变量                           | 说明                                                |
| ------------------------------ | --------------------------------------------------- |
| `DATABASE_URL`                 | `postgresql://be-water:...@localhost:5433/be-water` |
| `JWT_SECRET`                   | ≥32 字符随机串                                      |
| `TENANT_SECRET_ENCRYPTION_KEY` | 32 字节 hex（`openssl rand -hex 32`）               |

租户级密钥（如各租户自带的 LLM API Key）以 AES-GCM 加密存库，用 `TENANT_SECRET_ENCRYPTION_KEY` 作主密钥——不要在环境变量里放租户数据。完整列表见 `.env.example`。

---

## API 规范

```typescript
{ data: T }                                     // 成功
{ data: T[], meta: { total, page, page_size } }  // 分页
{ error: string, code?: string }                 // 错误
```

`200` 成功 · `201` 创建 · `400` 参数错误 · `401` 未授权 · `403` 无权限 · `404` 不存在 · `409` 冲突 · `500` 内部错误

字段命名：DB / API / 类型 / 列表 URL 参数一律 `snake_case`，路由 path 参数用 camelCase。详见 [field-naming-conventions.md](docs/design/field-naming-conventions.md)。

---

## 部署

生产与测试统一走 Docker Compose（`docker-compose.prod.yml`），宿主机 Nginx 终结 SSL。

```bash
cp scripts/env.production.example .env.production
pnpm bootstrap -- --env production   # 首次：装依赖、建栈、配 Nginx + SSL
pnpm deploy    -- --env production   # 更新
```

也可由 `git tag v*` 触发 GitHub Actions 自动部署。详见 [deployment.md](docs/deployment.md)。

---

## 文档

- [文档索引](docs/README.md) · [模块化架构](docs/design/modular-architecture.md)
- [权限系统](docs/design/permission-system.md) · [租户配置](docs/design/tenant-config.md) · [功能开关与配额](docs/design/tenant-features.md)
- [部署](docs/deployment.md) · [FAQ](docs/faq.md)
