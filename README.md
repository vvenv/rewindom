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

多租户 SaaS **模块化单体**：内核 + 基础设施模块 + 示例业务模块。内核与基础设施**不含业务领域代码**；业务以模块挂载，`notes` 为金标准复制起点。

| 类型 | 模块 |
| --- | --- |
| 基础设施 | `user` 认证/JWT · `platform` 租户/套餐/配额 · `rbac` PBAC（未启用则登录即可访问）· `audit` 审计 · `notification` 站内通知 · `background-job` BullMQ 任务中心 · `error-log` / `slow-query` 可观测 · `marketing` 官网（介绍/文档/定价，构建期预渲染） |
| 业务 | `billing` 租户订阅与付款（Creem） |
| 示例 | `notes` 金标准 CRUD · `todos` 由 `gen:module` 生成并手工定制的列表示例 |

**不是**：脚手架生成器、微服务框架、低代码平台。

---

## 快速开始

前置：Node.js 22+、pnpm 11+、Docker。

```bash
git clone <repo-url> && cd be-water
pnpm install
pnpm setup    # 幂等：.env.local + Postgres/Redis + migration
pnpm dev
```

- 前端 `http://localhost:7300`（Vite HMR）——`/` 是官网，应用入口 `/app`
- API `http://localhost:3700`（`/api` 由 Vite 代理）

`pnpm setup` 可重复执行；仅起库：`pnpm db:up`。

---

## 架构

编译期组装、单进程部署。每模块自带 server 路由、client 页面、shared 契约与 `MODULE.md`。

1. **内核不依赖业务** — HTTP 栈、认证、租户上下文、ModuleLoader、EventBus
2. **模块间禁止直接 import** — 跨模块走 manifest `requires` + Event Bus / Provider / Slot
3. **模块可按租户开关** — 未开通不挂路由、不进侧栏

边界由 `pnpm check:deps` 强制（包层环 + manifest/schema FK + 文件级环）。新模块：`pnpm gen:module <spec.yaml>` 或复制 `packages/modules/notes/`。详见 [modular-architecture.md](docs/design/modular-architecture.md)。

前端有四类路由挂载点：`renderPublicRoutes`（无守卫，官网/文档）、`renderGuestRoutes`（登录注册，已登录会被弹走）、`renderTenantRoutes`（租户应用）、`renderPlatformRoutes`（平台控制台）。公开路由要能在**没有任何 Provider** 的环境下渲染——构建期预渲染就跑在那种环境里。

---

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 后端 | Fastify 5 · TypeScript 6 · Prisma 7 |
| 数据 | PostgreSQL 16 · Redis 7 · BullMQ |
| 前端 | React 19 · Vite 8 · React Router v8 · TanStack Query/Table |
| UI | shadcn/ui · Tailwind CSS 4 |
| 认证 | JWT 双 Token（access + refresh） |
| LLM | OpenAI 兼容（可选，默认 DeepSeek） |
| 部署 | Docker Compose（生产）· 宿主机热更新（开发） |

---

## 目录结构

```
be-water/
├── apps/
│   ├── server/              # Fastify 组装 + Prisma schema/migrations
│   │   └── src/enabled-modules.ts
│   └── client/              # React 组装 + 产品壳（登录、Layout、Sidebar）
│       ├── src/enabled-modules.ts
│       └── src/shell/
├── packages/
│   ├── modules/             # 业务与基础设施（server + client + shared）
│   ├── server-kernel/       # 内核：HTTP、认证、ModuleLoader、EventBus
│   ├── client-kit/          # api、守卫、PageLayout、Slot
│   ├── shared/ · ui/        # 跨端类型 · shadcn 基础组件
│   └── server-test/ · client-test/
├── docker/ · docs/ · scripts/
```

模块加载只看两处 `enabled-modules.ts`。

---

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm setup` / `pnpm dev` | 本地初始化（幂等）/ 启前后端 |
| `pnpm db:up` / `db:down` / `db:studio` | 本地库启停 / Prisma Studio |
| `pnpm db:pull` / `seed` | 拉取远程库到本地 / 初始化种子数据 |
| `pnpm build` / `pnpm start` | 构建 / 生产模式启动 |
| `pnpm test` / `pnpm check` | 测试 / lint + test |
| `pnpm check:deps` / `check:modules` | 模块边界校验 / 契约校验（注册表、权限、nav） |
| `pnpm gen:module <spec.yaml>` | 从 spec 生成模块骨架 |
| `pnpm docker:stack:up` | 本地生产 Docker 栈（需 `.env.docker.local`） |
| `pnpm bootstrap` / `deploy` / `release` | 远程首次部署 / 更新 / 发版 |

---

## 环境变量

复制 `.env.example` → `.env.local`，至少：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | `postgresql://be-water:...@localhost:5433/be-water` |
| `JWT_SECRET` | ≥32 字符随机串 |
| `TENANT_SECRET_ENCRYPTION_KEY` | 32 字节 hex（`openssl rand -hex 32`） |

租户级密钥（如 LLM API Key）AES-GCM 加密存库，主密钥为 `TENANT_SECRET_ENCRYPTION_KEY`。完整列表见 `.env.example`。

付款（`billing` / Creem，可选）：

| 变量 | 说明 |
| --- | --- |
| `CREEM_API_KEY` | Test/Live API Key；空则无法发起 checkout |
| `CREEM_WEBHOOK_SECRET` | Webhook 验签密钥（与 Dashboard 一致） |
| `CREEM_SERVER` | `test` \| `prod`（本地联调用 `test`） |
| `CREEM_PRODUCT_MAP` | JSON：`{"starter":"prod_xxx",...}`（必须是 `prod_` 开头的商品 ID，不是套餐 slug） |
| `CREEM_STORE_ID` | 可选；默认见 `.env.example` |

---

## 本地测试 Creem 付款

Webhook 打的是 **API（3700）**，不是前端（7300）。

1. `.env.local` 配好上表 Creem 变量，`pnpm dev`
2. 隧道指向 API：

```bash
ngrok http 3700
# 或：cloudflared tunnel --url http://localhost:3700
```

3. Creem Dashboard（**Test Mode**）→ Developers → Webhooks，Endpoint 填：

```
https://<ngrok-host>/api/billing/webhooks/creem
```

Signing secret 与 `CREEM_WEBHOOK_SECRET` 一致；改配置后重启 server。

4. 浏览器打开 `http://localhost:7300/billing` → 升级 → 用 test 卡付款。开通以 webhook 为准（看 server 日志 `[billing] creem webhook processed`），回跳 URL 只是页面返回。

详情与权限说明见 [`packages/modules/billing/MODULE.md`](packages/modules/billing/MODULE.md)。

---

## API 与命名

```typescript
{ data: T }                                      // 成功
{ data: T[], meta: { total, page, page_size } }   // 分页
{ error: string, code?: string }                  // 错误
```

状态码：`200` 成功 · `201` 创建 · `400` 参数 · `401` 未授权 · `403` 无权限 · `404` 不存在 · `409` 冲突 · `500` 内部错误。

DB / API / 类型 / 列表 URL 用 `snake_case`，路由 path 参数用 camelCase → [field-naming-conventions.md](docs/design/field-naming-conventions.md)。

---

## 部署

生产与测试走 Docker Compose（`docker-compose.prod.yml`），宿主机 Nginx 终结 SSL。

```bash
cp scripts/env.production.example .env.production
pnpm bootstrap -- --env production   # 首次
pnpm deploy    -- --env production   # 更新
```

亦可 `git tag v*` 触发 GitHub Actions。详见 [deployment.md](docs/deployment.md)。

---

## 文档

[文档索引](docs/README.md) · [模块化架构](docs/design/modular-architecture.md) · [权限](docs/design/permission-system.md) · [租户配置](docs/design/tenant-config.md) · [功能开关与配额](docs/design/tenant-features.md) · [部署](docs/deployment.md) · [FAQ](docs/faq.md)
