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

**Agent-first** 的多租户 SaaS **模块化单体**：内核 + 内置基础设施 + 可选外部业务模块。用 `AGENTS.md`、Cursor/Claude Skills 与 `gen:module` → `check:modules` 闭环，让编码 Agent 在强制边界内扩展业务。内核与基础设施**不含业务领域代码**；业务以模块挂载，外部示例以 `modules/note` 为金标准。

| 类型 | 模块 |
| --- | --- |
| 基础设施（`packages/builtin/`） | `user` 认证/JWT · `platform` 租户/套餐/配额 · `rbac` PBAC（未启用则登录即可访问）· `audit` 审计 · `notification` 站内通知 · `background-job` BullMQ 任务中心 · `error-log` / `slow-query` 可观测 · `dashboard` 工作台 · `marketing` 官网 CMS（主域=默认租户 SSR） · `site-member` 站点会员 · `billing` 平台租户订阅（Creem） · `site-billing` 站点会员订阅 |
| 外部业务（`modules/`） | `note` 金标准 CRUD · `todo` 列表示例 · `bookmark` 书签示例（由 `pnpm gen:external-modules` 装进组装层） |

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

当前生产（`.env.production`）：`APP_DOMAIN=water.moms.plus`，`TENANT_BASE_DOMAIN=water.moms.plus`。
由 Host 决定，与本地同构：

| 要进哪儿   | 地址 | env |
| ---------- | ---- | --- |
| 产品站     | https://water.moms.plus/ | `FRONTEND_URL` |
| 租户管理台（工作台） | https://water.moms.plus/app | 同上 |
| 租户登录   | https://water.moms.plus/login | 同上；未登录访问 `/app` 会转到此页 |
| 其他租户登录 | `https://{slug}.water.moms.plus/login` 或租户 `custom_domain` 上的 `/login` | `TENANT_BASE_DOMAIN` |
| 租户站点   | 租户 `custom_domain` 或 `https://{slug}.water.moms.plus` | `TENANT_BASE_DOMAIN` |
| 平台控制台 | https://admin.water.moms.plus/platform | `PLATFORM_URL` / `PLATFORM_HOST` |

`PLATFORM_URL` 必须与 `FRONTEND_URL` **不同 Host**：nginx 按 Host 分流（见
`docker/nginx/default.conf.template` 的 `$use_tenant_ssr`），平台 Host 走静态 SPA，
其余 Host 的 HTML 反代给 Marketing SSR。完整口径见
[tenant-config.md](docs/design/tenant-config.md) 的「自定义域名 / Host 绑定」。

#### 生产：登录租户管理台

1. **默认租户（产品站 Host）**：打开 https://water.moms.plus/login ，或 https://water.moms.plus/app （未登录自动转 `/login`）。
2. **其他租户**：`https://{slug}.water.moms.plus/login`，或该租户绑定域名上的 `/login`（Host 锁定租户，可用裸用户名）。
3. **凭据**：租户 User（工作台账号），与平台管理员不是同一套身份；多租户登录标识见 [tenant-config.md](docs/design/tenant-config.md)。

#### 生产：登录平台管理后台

1. **DNS**：`admin.water.moms.plus` 需 A/CNAME 指向与 `water.moms.plus` 相同的服务器；TLS 证书须覆盖该 Host（通配 `*.water.moms.plus` 或单独签发 `admin.water.moms.plus`）。
2. **打开** https://admin.water.moms.plus/platform （不要用 `water.moms.plus`）。未登录会转到同 Host 的 `/login`。
   - 入口用 **`/platform`**，不要只打开 https://admin.water.moms.plus/ ——根路径在控制台 Host 上没有官网，旧版会把自己硬跳进死循环（已修：根路径会转到 `/platform`）。
   - 在 https://water.moms.plus/platform 会被送到平台 Host。
3. **凭据**（`.env.production`，首次启动写入 `PlatformAdmin`）：

   | | |
   | --- | --- |
   | 用户名 | `vvenv`（`PLATFORM_ADMIN_USERNAME`） |
   | 密码 | `.env.production` 的 `PLATFORM_ADMIN_PASSWORD` |

   登录时**不要**加 `@tenant` 后缀。平台管理员与租户 User 是两套身份。
4. **改密码后生效**：若改了 env 密码但库里已有同名管理员，不会自动覆盖——需在控制台改密，或清库后重启让 bootstrap 重建（仅空环境适用）。改 env 后执行 `pnpm deploy -- --env production --env-only` 同步到容器。

---

## 架构

编译期组装、单进程部署。每模块自带 server 路由、client 页面、shared 契约与 `MODULE.md`。

1. **Agent-first** — `AGENTS.md` + Skills + Spec → `gen:module` → `check:modules` / `check:deps`
2. **内核不依赖业务** — HTTP 栈、认证、租户上下文、ModuleLoader、EventBus
3. **模块间禁止直接 import** — 跨模块走 manifest `requires` + Event Bus / Provider / Slot
4. **模块可按租户开关** — 未开通不挂路由、不进侧栏

边界由 `pnpm check:deps` 强制（包层环 + manifest/schema FK + 文件级环）。

- **内置能力**改 `packages/builtin/<id>/`，在两处 `enabled-modules.ts` 手写注册
- **业务模块**用 `pnpm gen:module <spec.yaml>` 生成到 `modules/<id>/`（经 `@be-water/module-sdk` 门面，不直连内核），再 `pnpm gen:external-modules` 装进组装层；金标准是 `modules/note`

详见 [modular-architecture.md](docs/design/modular-architecture.md) 与 [agent-first.md](docs/design/agent-first.md)。

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
│   │   └── src/enabled-modules.ts   # 内置 + …EXTERNAL_SERVER_MODULES
│   └── client/              # React 组装 + 产品壳（登录、Layout、Sidebar）
│       └── src/enabled-modules.ts
├── packages/
│   ├── builtin/             # 内置基础设施（user / platform / billing / marketing …）
│   ├── module-sdk/          # 外部模块门面（禁止直连 server-kernel / client-kit）
│   ├── server-kernel/       # 内核：HTTP、认证、ModuleLoader、EventBus
│   ├── client-kit/          # api、守卫、PageLayout、Slot
│   ├── shared/ · ui/        # 跨端类型 · shadcn 基础组件
│   └── server-test/ · client-test/
├── modules/                 # 外部业务包（note / todo / bookmark …）
├── docker/ · docs/ · scripts/
```

内置模块在两处 `enabled-modules.ts` 手写；外部模块由 `pnpm gen:external-modules` 生成聚合文件再展开。

---

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm setup` / `pnpm dev` | 本地初始化（幂等）/ 启前后端 |
| `pnpm db:up` / `db:down` / `db:studio` | 本地库启停 / Prisma Studio |
| `pnpm db:pull` / `seed` | 拉取远程库到本地 / 初始化种子数据 |
| `pnpm build` / `pnpm start` | 构建 / 生产模式启动 |
| `pnpm test` / `pnpm check` | 测试 / lint + test |
| `pnpm check:deps` / `check:modules` / `check:i18n` | 模块边界 / 契约（注册表、权限、nav）/ 客户端文案 |
| `pnpm gen:module <spec.yaml>` | 从 spec 生成外部业务模块骨架（`modules/<id>/`） |
| `pnpm gen:external-modules` | 聚合 `modules/*` 到组装层（通常由 gen:module 触发） |
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

## 套餐定价与官网段

平台套餐分两层：

| 层 | 内容 | 改在哪 |
| --- | --- | --- |
| 结构 | 有哪几个 slug、配额、功能开关 | 代码 `PRICING_PLANS`（发版） |
| 运营 | 价格、上架、推荐、排序、名称/卖点文案 | 平台控制台套餐配置（`AppSetting.plan_pricing`） |

官网段 `billing.plans`（平台套餐）是**数据驱动**的：段 settings 只管版式与 CTA，不存第二份价格。SSR 渲染前由 `registerSectionContextProvider` 按需注入目录；公开只读接口 `GET /api/public/plans` 与编辑器预览读同一份合并结果（未配置字段回落到代码默认值）。

站点会员定价段 `site-billing.plans` 读的是站点自建的 `MemberPlan`，与平台套餐无关——见 [`packages/builtin/site-billing/MODULE.md`](packages/builtin/site-billing/MODULE.md)。

## 本地测试 Creem 付款

两条付款域、两套 webhook，都打 **API（3700）**，不是前端（7300）。

| 域 | 谁付钱 | 工作台 / 会员入口 | Webhook |
| --- | --- | --- | --- |
| 平台租户付费（`billing`） | 组织（工作台用户） | `http://localhost:7300/app/billing` | `/api/billing/webhooks/creem` |
| 站点会员付费（`site-billing`） | 站点会员 | `http://localhost:7300/member/billing` | `/api/site-billing/webhooks/creem` |

1. `.env.local` 配好上表 Creem 变量，`pnpm dev`
2. 隧道指向 API：

```bash
ngrok http 3700
# 或：cloudflared tunnel --url http://localhost:3700
```

3. Creem Dashboard（**Test Mode**）→ Developers → Webhooks，Endpoint 填对应路径；Signing secret 与 `CREEM_WEBHOOK_SECRET`（或站点覆盖密钥）一致；改配置后重启 server。

4. 浏览器走对应入口 → 用 test 卡付款。开通以 webhook 为准（看 server 日志），回跳 URL 只是页面返回。

详情见 [`packages/builtin/billing/MODULE.md`](packages/builtin/billing/MODULE.md) 与 [`packages/builtin/site-billing/MODULE.md`](packages/builtin/site-billing/MODULE.md)。

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
