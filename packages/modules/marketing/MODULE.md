# module-marketing

## 用途

对外官网：产品介绍、使用文档、定价。**构建期预渲染成静态 HTML**，爬虫拿到的是完整正文
而不是空的 SPA 外壳。

## 面划分

| 面   | 路由                                                                 | 目录             | 守卫                         |
| ---- | -------------------------------------------------------------------- | ---------------- | ---------------------------- |
| 公开 | `/`、`/pricing`、`/docs`、`/docs/:slug` 及 `/{locale}/...` 前缀形态 | `client/public/` | 无——登录与未登录都按原样渲染 |

挂载点是 `client.renderPublicRoutes`，不是 `renderGuestRoutes`：后者套 `GuestOnlyRoute`，
已登录用户会被重定向走，那是登录/注册页的语义。官网对两种身份都必须可见。

`/` 由本模块占据，因此**登录后的落地页不是 `/`**，而是 `HOME_PATH_CANDIDATES` 解析出的路径。
外部链接想进应用一律指向 `/app`（app-shell 的稳定入口，会重定向到解析后的首页）。

## 无 Provider 约束（重要）

公开页面会在**没有任何 App Provider** 的环境下被渲染一次——预渲染脚本跑的是裸 React。
因此本模块的页面与组件：

- 不用 `useAuth`（无 Provider 会抛），要登录态用 `useOptionalAuth`，静态 HTML 一律按未登录出
- 不发请求（没有 `QueryClientProvider`，也不该让官网首屏依赖 API）
- 不碰 `window` / `document` / `localStorage`（渲染期；`useEffect` 里可以，SSR 不执行）
- 不套 `PageLayout`：那是租户应用页的外壳，官网用 `MarketingLayout`

违反第一、三条的表现是 `pnpm --filter client build` 在预渲染阶段直接失败，不会带上线。

## 内容在哪

| 内容           | 位置                                  | 说明                                                                           |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| 文档正文       | `content/docs/*.md`                   | frontmatter 必填 `title` + `description`（进 `<head>`），`slug` 可省则取文件名 |
| 文档顺序       | 文件名数字前缀                        | `01-quickstart.md` → 目录第一项                                                |
| 首页文案       | `shared/features.ts`                  | HERO、卖点、内建模块、技术栈                                                   |
| 定价包装       | `shared/pricing.ts`                   | 卖点、CTA、推荐位                                                              |
| 定价数字       | `../platform/shared/pricing-plans.ts` | **价格与配额的唯一真相源**，官网不另存一份                                     |
| 站点信息 / SEO | `shared/site.ts`、`shared/seo.ts`     | 站名、导航、页脚、canonical 与 JSON-LD 构造                                    |
| 每页 SEO       | `client/lib/seo-routes.ts`            | `MARKETING_ROUTES`：预渲染、sitemap、SPA 改 title 共用一份                     |

新增文档 = 往 `content/docs/` 扔一个 `.md`，路由与目录自动出现。
新增**页面**要三处同步：`client/public/routes.tsx`、`MARKETING_STATIC_PATHS`、`MARKETING_ROUTES`
——漏了不会生成静态 HTML 也不进 sitemap，`public/routes.test.tsx` 会拦下来。

## 为什么依赖 platform

`requires: ["platform"]` 是为了 `shared/pricing.ts` 读 `PRICING_PLANS`。
官网若自己抄一份价格与席位数，改了套餐忘了改官网就会变成「宣传 10 人、实际 3 人」的事故，
那属于对外承诺与系统行为不一致，比多一条模块依赖严重得多。官网只拥有**包装**（文案、CTA、
展示哪些套餐），数字全部来自 platform。

## 预渲染

产物由 `apps/client` 的构建流水线生成：

```bash
pnpm --filter client build        # vite build → vite build --ssr → prerender
SITE_URL=https://your-domain.com pnpm --filter client build   # 指定 canonical 域名
```

输出 `dist/index.html`、`dist/pricing/index.html`、`dist/docs/<slug>/index.html`、
以及各语言前缀页（`dist/en/...`、`dist/zh-CN/...`）、`dist/sitemap.xml`、`dist/robots.txt`。
逻辑路由表在 `MARKETING_ROUTES`；带 locale 的展开见 `expandLocalizedMarketingRoutes`。
细节见 `apps/client/scripts/prerender.mjs` 与 `docs/design/i18n.md`。

浏览器里 SPA 会用同一份路由重新渲染这些页面（`createRoot` 而非 `hydrateRoot`），
所以静态 HTML 与运行时状态不一致（例如未登录 → 已登录）不会报 hydration 错误。

`/docs/<不存在的 slug>` 没有静态产物，会走 nginx 的 SPA 兜底，由页面渲染「文档不存在」并返回 200。
真要 404 状态码得让 nginx 或 server 参与，当前刻意没做。

## 如何单独测试

```bash
pnpm --filter modules exec vitest --run --project 'marketing/*'
```
