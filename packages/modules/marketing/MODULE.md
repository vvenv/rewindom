# module-marketing

## 用途

双轨官网：

1. **平台主域**：产品介绍、使用文档、定价——**构建期预渲染**静态 HTML（爬虫拿完整正文）
2. **租户绑定域**（`custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}`）：租户自助 CMS（section 编排 + Markdown + 站点主题），由 **Fastify SSR** 输出完整 HTML（SEO）

## 面划分

| 面               | 路由                                                                 | 目录                                         | 守卫                                         |
| ---------------- | -------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| 公开（平台）     | `/`、`/pricing`、`/docs`、`/docs/:slug` 及 `/{locale}/...`           | `client/public/`                             | 无                                           |
| 公开（租户 SSR） | `/`、`/docs`、`/docs/:slug`、`/:slug`、`/sitemap.xml`、`/robots.txt` | `server/ssr.routes.ts`                       | Host 绑定 + 站点已发布                       |
| 租户中台         | `/site`、`/site/pages/:pageId`（Theme Editor）                       | `client/tenant/` + `client/pages/site-*.tsx` | entitlement `tenant-marketing` + `site.read` |

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

| 模型            | 说明                                                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MarketingSite` | 每租户一行：站名、标语、`theme_settings`（logo / 主色 / 字体）、站点级 `published`；`nav_json` / `footer_json` 现在存**页头 / 页脚 section**（旧的链接数组自动迁移） |
| `MarketingPage` | `kind`: `home` \| `page` \| `doc`；`status`: `draft` \| `published`；`sections[]`；`body_md`（sections 为空时回退）                                                  |

### Section schema（唯一真相源）

section 的定义分三层，`shared/section-schema.ts` 统一 re-export，调用方只 import 它：

| 文件                  | 职责                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `section-settings.ts` | setting 的类型系统 + 解析（`text`/`textarea`/`richtext`/`list`/`url`/`image`/`select`/`icon`/`range`/`checkbox`/`color` + 排版用 `header`/`paragraph`） |
| `section-registry.ts` | `SECTION_DEFINITIONS`——所有 section / block 的声明                                                                                                      |
| `section-schema.ts`   | 按 schema 解析脏数据、按 schema 造默认值                                                                                                                |

基础架构对齐 Shopify theme editor：section 声明 `settings` 与可重复的 `blocks`，
编辑器由 schema 自动渲染表单、渲染端按 id 读值、写入路径按同一份 schema 校验。
存储结构统一为 `{ id, type, settings, blocks[] }`，block 为 `{ id, type, settings }`。

**站点级**（`scope: "site"`，每站点各一个，出现在所有页面上）：

| type     | settings                                                                 | blocks                                                                |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `header` | show_logo, show_site_name, sticky, show_login, login_label, primary 按钮 | `nav_link`{label\*, href}，最多 8                                     |
| `footer` | show_logo, blurb, copyright                                              | `footer_link`{group, label\*, href}，最多 24；同 `group` 的排进同一列 |

**页面级**（`scope: "page"`，可在编辑器里往页面上加）：

| type           | settings                                                               | blocks                                                                                  |
| -------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `hero`         | eyebrow, headline\*, subhead, align, show_glow, primary/secondary 按钮 | `stat`{term\*, detail}，最多 4                                                          |
| `feature-grid` | 抬头, columns(2–4), show_icons                                         | `feature`{icon, title\*, body}，最多 12                                                 |
| `steps`        | 抬头, primary 按钮, columns, show_number                               | `step`{title\*, body, code}，最多 8                                                     |
| `spec-list`    | 抬头, primary 按钮, layout(split/stacked)                              | `row`{term\*, detail}，最多 12                                                          |
| `cards`        | 抬头, columns, card_style                                              | `card`{title\*, body, href}、`stat`{value\*, label}，最多 12                            |
| `pricing`      | 抬头, columns, footnote, featured_badge                                | `plan`{name\*, audience, price, price_note, highlights, featured, primary 按钮}，最多 6 |
| `faq`          | 抬头                                                                   | `qa`{question\*, answer}，最多 20                                                       |
| `prose`        | body_md                                                                | —                                                                                       |
| `split`        | title\*, body, aside_md, media_position, primary 按钮                  | —                                                                                       |
| `band`         | headline\*, body, align, primary/secondary 按钮                        | —                                                                                       |

`*` = `required`，为空时该 section 校验失败。

每个页面级 section 另有一组**通用版式**（`layoutSettings()`，编辑器「版式」页签）：
`width` · `content_width` · `background`(none/muted/accent/outline) · `padding_top` / `padding_bottom`
· `spacing_above` / `spacing_below` · `divider`(none/top/bottom/both) · `anchor`。
所有留白存的都是**桌面 px**，窄屏两处渲染统一 ×0.7；`anchor` 归一化成 slug 后作为
`<section id>`，供页内导航链 `#anchor`。

### 宽度：两个正交维度

限宽**落在 section 内部**（页面外壳只做纵向流），外层「色块」（背景 / 分隔线 / 上下留白）与
内层「正文」各自一档，组合出四种真实排版：

| `width` | `content_width` | 效果                                     |
| ------- | --------------- | ---------------------------------------- |
| page    | default         | 常规区块（默认）                         |
| page    | narrow          | 文档正文、长文                           |
| full    | default         | 通栏色带 + 居中正文（Shopify Dawn 口径） |
| full    | full            | 通栏大图 hero / 满屏媒体                 |

页宽本身是主题设置（紧凑 / 标准 / 宽），走 `--site-page-width`，页头页脚与 section 同一个变量。
通栏色块是方角（贴视口边的圆角会露缺口）；切底色不会让正文横向位移。文档页的侧栏布局外层
已限宽，section 不再自带 gutter、`full` 退化为 `page`（SPA 走 `SiteSections` 的 `contained`，
SSR 走 `.side-main` 后代选择器）。

### 间距：段内 padding + 段间 spacing

两者互不相扰，这是 Shopify 的分工：`padding_*` 是色块**内**的留白（底色包住），
`spacing_*` 是段与段之间的缝。段间距默认继承主题的「区块间距」，滑块最左一格（哨兵负值，
见 `allow_inherit`）表示继承——和 padding 用同一种控件、同一个单位，租户不用先分清概念。

一条缝由相邻两段共同决定：**显式覆盖压过继承**，两边都显式时取较大的一方。不能无脑取 max——
那样某段设成 0（想和上一段拼成连续色带）会被邻居继承来的主题值挡住。缝隙由
`resolveSectionGaps()` 显式算好落到后一段上，**不靠 margin 折叠**：折叠依赖包装层没有
padding/border/overflow，哪天有人加一句 `overflow-hidden` 就会静默翻倍。

**新增字段只改 schema + 两处渲染**：`client/components/sections/`（SPA）与
`server/ssr-sections.ts`（SEO HTML）。新增 setting 类型再在 `SettingsFields.tsx` 加一个分支。
`label` / `content` 存的是 i18n key（`marketing` namespace 下相对 key），shared 层不含展示文案。

读库兼容旧数据：type `features`→`feature-grid`、`cta`→`band`、`richtext`/`markdown`→`prose`；
字段 `cta_label`/`cta_href`→`primary_*`、`description`→`body`、band 的 `tone`→`background`、
`divider_top`/`divider_bottom`→`divider`；`settings.items[]` 自动提升为
blocks；`nav_json`/`footer_json` 的 `{label,href}[]` 自动迁成页头 / 页脚 blocks。
未知 block type 直接丢弃；`safeSections` 只跳过损坏的单个 section，不再整页清空。

路径约定：`home` → `/`；`doc` + `index` → `/docs`；`doc` + slug → `/docs/:slug`；`page` → `/:slug`。
`pricing` 不再是保留 slug——绑定域名上的 `/pricing` 归租户（`Pricing` 组件已按租户站点回落）。

### Theme Editor

`/app/site/pages/:pageId` 三栏：

- **左**：页头 / 页面区块 / 页脚三组区块树（对齐 Shopify sections group），section → blocks 两层，增删排序都在这里；页头页脚不可删不可移
- **中**：同页预览（`TenantSiteView`），点击任意区块即选中
- **右**：由 schema 渲染的设置面板（选中 section 或 block）

保存一次写两个资源：页面 sections → `PATCH /api/site/pages/:id`，页头页脚 → `PATCH /api/site`。
草稿预览 API：`GET /api/site/preview?path=`（需 `site.read`，含 draft）。

**页面预设**（`client/lib/page-presets.ts`）一键铺出默认官网版式：首页 / 定价 / 文档 / 关于 / 联系。
预设只描述结构 + i18n key，文案在创建时用 `t()` 落成当前语言的普通内容，套完随便改。

**站点主题**（Logo / 主色 / 字体）已从编辑器移出，并入「系统管理 → 品牌」（`/settings`）：
`platform` 开 `settingsBrandingExtraSlot`，本模块通过 `client.shell.shellProviders`
注入 `SiteThemeCard`（`platform` 不得反向 import 业务模块）。未开通 `tenant-marketing`
的租户不渲染该卡片也不发请求。

API：

- 租户：`/api/site`、`/api/site/pages…`、`/api/site/preview`（权限 `site.read` / `site.write`）
- 公开：`GET /api/public/site`、`GET /api/public/site/page?path=`
- Entitlement key：`tenant-marketing`

现有租户管理员补权限：`pnpm --filter server exec tsx scripts/sync-builtin-admin-permissions.ts`

## 平台内容在哪

| 内容           | 位置                                                          | 说明                                     |
| -------------- | ------------------------------------------------------------- | ---------------------------------------- |
| 文档正文       | `content/docs/*.md`                                           | frontmatter 必填 `title` + `description` |
| 首页文案       | `shared/features.ts` + `client/locales/*.json`                |                                          |
| 定价包装       | `shared/pricing.ts`                                           | 数字来自 platform `PRICING_PLANS`        |
| 站点信息 / SEO | `shared/site.ts`、`shared/seo.ts`、`client/lib/seo-routes.ts` | 仅平台预渲染                             |

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

## 本地种子数据

```bash
# 给 local 租户铺一套与默认官网对齐的站点（首页 / 文档 / 定价 + 页头页脚 + 品牌色）
pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenantSlug]

# 只发首页的最小 SSR 冒烟
pnpm --filter server exec tsx scripts/seed-tenant-site-smoke.ts
```

`seed-local-marketing-site.ts` 的内容直接取自默认官网的数据源（`HERO`、`FEATURES`、
`BUILTIN_MODULES`、`TECH_STACK`、`MARKETING_PLANS`、`PRICING_FAQ`、`content/docs/*.md`），
改了那些常量重跑即可同步，不用手抄文案。按 `kind + slug` upsert，可反复执行。

## 如何单独测试

```bash
pnpm --filter modules exec vitest --run --project 'marketing/*'
curl -sS -H 'Host: {slug}.{TENANT_BASE_DOMAIN}' http://127.0.0.1:3700/ | head
```
