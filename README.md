<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
  <img src="docs/assets/logo.svg" width="88" height="88" alt="be-water">
</picture>

# be-water

**Agent-first · 多租户 SaaS 底座 — 模块化 Monolith**

水无定形，遇器成形。底座随业务成形，而不是业务迁就底座。

</div>

---

## 这是什么

**Agent-first** 的多租户 SaaS **模块化单体**：内核 + 基础设施模块 + 示例业务模块。用 `AGENTS.md`、Cursor/Claude Skills 与 `gen:module` → `check:modules` 闭环，让编码 Agent 在强制边界内扩展业务。内核与基础设施**不含业务领域代码**；业务以模块挂载，`notes` 为金标准复制起点。

| 类型 | 模块 |
| --- | --- |
| 基础设施 | `user` 认证/JWT · `platform` 租户/套餐/配额 · `rbac` PBAC（未启用则登录即可访问）· `audit` 审计 · `notification` 站内通知 · `background-job` BullMQ 任务中心 · `error-log` / `slow-query` 可观测 · `marketing` 官网 CMS（主域=默认租户 SSR） |
| 业务 | `billing` 租户订阅与付款（Creem） |
| 示例 | `notes` 金标准 CRUD · `todos` 由 `gen:module` 生成并手工定制的列表示例 |

**不是**：无约束的脚手架喷发器、微服务框架、低代码平台。Agent 写代码，闸门与契约由框架强制。详见 [agent-first.md](docs/design/agent-first.md)。

---

## 快速开始

前置：Node.js 22+、pnpm 11+、Docker。

```bash
git clone <repo-url> && cd be-water
pnpm install
pnpm setup    # 幂等：.env.local + Postgres/Redis + migration
pnpm dev
```

- API `http://localhost:3700`（`/api` 由 Vite 代理）

`pnpm setup` 可重复执行；仅起库：`pnpm db:up`。

### 从哪个地址进（本地）

**`localhost` 与 `127.0.0.1` 不是同一个入口**——同一个 Vite 端口，按 Host 分流：
`localhost` 是产品站（隐式绑定默认租户），`127.0.0.1` 是平台控制台。这是刻意的，
免去改 `/etc/hosts` 就能在本地同时验证两种 Host。

| 要进哪儿       | 本地地址                              | 说明                                        |
| -------------- | ------------------------------------- | ------------------------------------------- |
| 租户官网       | `http://localhost:7300/`              | 默认租户的 CMS 站点（Fastify SSR）          |
| 租户工作台     | `http://localhost:7300/app`           | 稳定入口；未登录自动转 `/login`。所有工作台页面都在 `/app/*`（`/app/site`、`/app/dashboard`…） |
| 租户登录       | `http://localhost:7300/login`         | 租户锁定为默认租户                          |
| 站点会员       | `http://localhost:7300/member/login`  | 站点前台的终端客户，与工作台用户是两套身份  |
| **平台控制台** | **`http://127.0.0.1:7300/platform`**  | 未登录自动转 `/login`；平台管理员在此登录   |

常见困惑：在 `localhost:7300/platform` 打不开控制台——那个 Host 绑着租户，控制台不在
上面，会被转到 `127.0.0.1:7300/platform`。反过来，`127.0.0.1:7300/` 也没有官网，
它会直接进控制台入口。

#### 本地调多个租户

把基域设成 `localhost`（`.env.local`），然后直接开 `http://{slug}.localhost:7300`：

```bash
TENANT_BASE_DOMAIN=localhost
```

浏览器原生把 `*.localhost` 解析到回环地址，**不用改 hosts 文件**。三个入口互不影响：
`localhost` 仍是默认租户、`127.0.0.1` 仍是平台控制台、`{slug}.localhost` 是对应租户
（`app` / `api` / `platform` 等保留前缀不会被当成租户）。

要验自定义域名那条分支，就把某个租户的 `custom_domain` 设成 `shop.localhost` 之类，
同样直接可访问。

> 刻意**不做**「开发态把当前 origin 手动绑到某租户」的旁路：那会绕过
> `resolveHostTenant`，让最容易在生产出问题的 Host 解析恰好成为本地唯一不被验证的
> 环节，还得为它加一道非生产门禁（本质是「按 Host 冒充租户」）。用真域名走真路径更省事。

### 生产

由 Host 决定，与本地同构，只是换成真实域名：

| 要进哪儿   | 地址                        | env             |
| ---------- | --------------------------- | --------------- |
| 产品站     | `https://{APP_DOMAIN}/`     | `FRONTEND_URL`  |
| 租户工作台 | `https://{APP_DOMAIN}/app`  | 同上            |
| 租户站点   | 租户 `custom_domain` 或 `{slug}.{TENANT_BASE_DOMAIN}` | `TENANT_BASE_DOMAIN` |
| 平台控制台 | `https://{PLATFORM_HOST}/platform` | `PLATFORM_URL` |

`PLATFORM_URL` 必须与 `FRONTEND_URL` **不同 Host**：nginx 按 Host 分流（见
`docker/nginx/default.conf.template` 的 `$use_tenant_ssr`），平台 Host 走静态 SPA，
其余 Host 的 HTML 反代给 Marketing SSR。完整口径见
[tenant-config.md](docs/design/tenant-config.md) 的「自定义域名 / Host 绑定」。

---

## 架构

编译期组装、单进程部署。每模块自带 server 路由、client 页面、shared 契约与 `MODULE.md`。

1. **Agent-first** — `AGENTS.md` + Skills + Spec → `gen:module` → `check:modules` / `check:deps`
2. **内核不依赖业务** — HTTP 栈、认证、租户上下文、ModuleLoader、EventBus
3. **模块间禁止直接 import** — 跨模块走 manifest `requires` + Event Bus / Provider / Slot
4. **模块可按租户开关** — 未开通不挂路由、不进侧栏

边界由 `pnpm check:deps` 强制（包层环 + manifest/schema FK + 文件级环）。新模块：`pnpm gen:module <spec.yaml>` 或复制 `packages/modules/notes/`。详见 [modular-architecture.md](docs/design/modular-architecture.md) 与 [agent-first.md](docs/design/agent-first.md)。

前端有四类路由挂载点：`renderPublicRoutes`（无守卫，租户 CMS 前台）、`renderGuestRoutes`（登录注册，已登录会被弹走）、`renderTenantRoutes`（租户应用）、`renderPlatformRoutes`（平台控制台，仅 `PLATFORM_URL` Host）。公开页 SEO 由 Fastify SSR 输出；SPA 接管后补交互层。

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

4. 浏览器打开 `http://localhost:7300/app/billing` → 升级 → 用 test 卡付款。开通以 webhook 为准（看 server 日志 `[billing] creem webhook processed`），回跳 URL 只是页面返回。

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

[文档索引](docs/README.md) · [Agent-first](docs/design/agent-first.md) · [模块化架构](docs/design/modular-architecture.md) · [权限](docs/design/permission-system.md) · [租户配置](docs/design/tenant-config.md) · [功能开关与配额](docs/design/tenant-features.md) · [部署](docs/deployment.md) · [FAQ](docs/faq.md)
