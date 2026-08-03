# module-marketing

## 用途

双轨官网：

1. **平台主域**：产品介绍、使用文档、定价——**构建期预渲染**静态 HTML（爬虫拿完整正文）
2. **租户绑定域**（`custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}`）：租户自助 CMS（section 编排 + Markdown + 站点主题），由 **Fastify SSR** 输出完整 HTML（SEO）

## 面划分

| 面 | 路由 | 目录 | 守卫 |
| ---- | -------------------------------------------------------------------- | ---------------- | ---------------------------- |
| 公开（平台） | `/`、`/pricing`、`/docs`、`/docs/:slug` 及 `/{locale}/...` | `client/public/` | 无 |
| 公开（租户 SSR） | `/`、`/docs`、`/docs/:slug`、`/:slug`、`/sitemap.xml`、`/robots.txt` | `server/ssr.routes.ts` | Host 绑定 + 站点已发布 |
| 租户中台 | `/site`、`/site/pages/:pageId`（Theme Editor） | `client/tenant/` + `client/pages/site-*.tsx` | entitlement `tenant-marketing` + `site.read` |

挂载点：`client.renderPublicRoutes`（平台/绑定域 SPA）+ `client.renderRoutes`（CMS）+ `server.registerRoutes`。

`/` 由本模块占据，因此**登录后的落地页不是 `/`**，而是 `HOME_PATH_CANDIDATES` 解析出的路径。
外部链接想进应用一律指向 `/app`。

## 无 Provider 约束（平台预渲染）

平台公开页面会在**没有任何 App Provider** 的环境下被渲染一次——预渲染脚本跑的是裸 React。

- 不用 `useAuth`（用 `useOptionalAuth`）
- **首屏渲染路径不发请求**（无 `QueryClientProvider`）。租户站点切换仅在 `useEffect` 中拉取 `/api/public/site*`，预渲染不跑 effect，静态 HTML 仍是平台官网
- 不碰 `window` / `document` / `localStorage`（渲染期）
- 不套 `PageLayout`：平台/租户公开页用 `MarketingLayout`；CMS 中台页用 `PageLayout`

## 租户 CMS 数据

| 模型 | 说明 |
| --- | --- |
| `MarketingSite` | 每租户一行：站名、标语、`theme_settings`（logo / 主色 / 字体）、nav/footer、站点级 `published`；`logo_url`/`primary_color` 列与 theme 双向同步 |
| `MarketingPage` | `kind`: `home` \| `page` \| `doc`；`status`: `draft` \| `published`；`sections[]`；`body_md`（sections 为空时回退） |

### Section 类型（布局原语）

| type | 说明 | settings |
| --- | --- | --- |
| `hero` | 首屏大标题区 | headline, subhead?, primary_label?, primary_href? |
| `prose` | Markdown 正文 | body_md |
| `cards` | 卡片栅格 | columns(2\|3\|4), items[{title, body, href?}] |
| `split` | 双栏 | title, body?, aside_md?, primary_label?, primary_href? |
| `band` | 通栏强调条 | headline, body?, primary_label?, primary_href? |

读库兼容旧 type：`features`→`cards`，`cta`→`band`，`richtext`/`markdown`→`prose`。

路径约定：`home` → `/`；`doc` + `index` → `/docs`；`doc` + slug → `/docs/:slug`；`page` → `/:slug`。

### Theme Editor

`/app/site/pages/:pageId` 三栏：左侧 section 列表（排序/增删）、中间同页预览（`TenantSiteView`）、右侧 section / theme settings。草稿预览 API：`GET /api/site/preview?path=`（需 `site.read`，含 draft）。

API：

- 租户：`/api/site`、`/api/site/pages…`、`/api/site/preview`（权限 `site.read` / `site.write`）
- 公开：`GET /api/public/site`、`GET /api/public/site/page?path=`
- Entitlement key：`tenant-marketing`

现有租户管理员补权限：`pnpm --filter server exec tsx scripts/sync-builtin-admin-permissions.ts`

## 平台内容在哪

| 内容 | 位置 | 说明 |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| 文档正文 | `content/docs/*.md` | frontmatter 必填 `title` + `description` |
| 首页文案 | `shared/features.ts` + `client/locales/*.json` | |
| 定价包装 | `shared/pricing.ts` | 数字来自 platform `PRICING_PLANS` |
| 站点信息 / SEO | `shared/site.ts`、`shared/seo.ts`、`client/lib/seo-routes.ts` | 仅平台预渲染 |

新增平台文档 = `content/docs/`；新增平台**页面**要三处同步：`client/public/routes.tsx`、`MARKETING_STATIC_PATHS`、`MARKETING_ROUTES`。

## Nginx 分流

见 `docker/nginx/default.conf.template`：`APP_DOMAIN`（及 `www.`）走静态预渲染；其余 Host 的 HTML 文档反代到 Fastify SSR；`/app` `/login` 等仍走 SPA。

本地 Vite：非 localhost Host 的文档导航由 `tenantMarketingSsrProxy` 代理到 `:3700`。

## 预渲染（平台）

```bash
pnpm --filter client build
SITE_URL=https://your-domain.com pnpm --filter client build
```

浏览器里 SPA 用 `createRoot` 覆盖预渲染 HTML；绑定域上则以 SSR HTML 为 SEO 真相源，SPA 再拉取公开 API 覆盖交互层。

## 如何单独测试

```bash
pnpm --filter modules exec vitest --run --project 'marketing/*'
curl -sS -H 'Host: {slug}.{TENANT_BASE_DOMAIN}' http://127.0.0.1:3700/ | head
```
