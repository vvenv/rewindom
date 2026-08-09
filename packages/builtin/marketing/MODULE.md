# module-marketing

## 用途

统一租户 CMS 官网（Fastify SSR）：

1. **产品主域**（`FRONTEND_URL` / `APP_DOMAIN` / 本地 `localhost`）：隐式绑定**默认租户**；bootstrap 幂等 apply `default` starter 并发布
2. **其它绑定域**（`custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}`）：对应租户的已发布站点
3. **平台控制台**在独立 Host（`PLATFORM_URL` / 本地 `127.0.0.1`），**不**走本模块 SSR

## 面划分

| 面           | 路由                                                                  | 目录                                         | 守卫                                           |
| ------------ | --------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| 公开（SSR）  | `/`、`/:slug`、嵌套路径（及 `/{locale}/…`）、`/sitemap.xml`、`/robots.txt` | `server/ssr.routes.ts` + `client/enhance/`   | Host 绑定（含主域→default）+ 站点已发布        |
| 租户中台     | `/app/site`、`/app/site/pages/:pageId`（Theme Editor）                        | `client/tenant/` + `client/pages/site-*.tsx` | entitlement `tenant-marketing` + `site.read` |

挂载点：`server.registerRoutes`（SSR + 公开 API）+ `client.renderRoutes`（CMS / Theme Editor）。
公开站**不**挂 React；交互由 `site-enhance`（无 React IIFE）渐进增强。

`/` 由本模块占据，因此**登录后的落地页不是 `/`**，而是 `HOME_PATH_CANDIDATES` 解析出的路径。
外部链接想进应用一律指向 `/app`。平台管理员入口在 `PLATFORM_URL`。

公开页 chrome 由 SSR HTML 产出；Theme Editor 预览用 React `SiteChrome` / `TenantSiteView`。
工作台页用 `PageLayout`。

## 租户 CMS 数据

| 模型            | 说明                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `MarketingSite` | 每租户一行：站名（可 `__i18n`）、标语、`theme_settings`、站点级 `published`；`nav_json` / `footer_json` 为**已发布** chrome，同名 `_draft_json` 为编辑器草稿（同进同退，共用一个 `chrome_dirty`）。导航条目嵌在页头 / 页脚列的 `settings.items` 里 |
| `MarketingPage` | `kind`: `home` \| `page`；`status`: `draft` \| `published`；`title` / `description` / `sections` / `settings` 为**已发布**正文，同名 `_draft` 四列为编辑器草稿（`settings` 即页面级画布覆盖，与正文同进同退） |

### Section schema（唯一真相源）

section 的定义分三层，`shared/section-schema.ts` 统一 re-export，调用方只 import 它：

| 文件                  | 职责                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `section-settings.ts` | setting 的类型系统 + 解析（`text`/`textarea`/`richtext`/`list`/`link`/`menu`/`image`/`select`/`icon`/`range`/`checkbox`/`color` + 排版用 `header`/`paragraph`） |
| `sections/`           | **一段一个目录**：`<type>/definition.ts` 是声明，`<type>/html.ts` 是 SSR 渲染；`sections/index.ts` 聚合成 `SECTION_DEFINITIONS`，`sections/html.ts` 聚合成渲染器表 |
| `section-schema.ts`   | 按 schema 解析脏数据、按 schema 造默认值                                                                                                                |

基础架构对齐 Shopify theme editor：section 声明 `settings` 与可重复的 `blocks`，
编辑器由 schema 自动渲染表单、渲染端按 id 读值、写入路径按同一份 schema 校验。
存储结构统一为 `{ id, type, settings, blocks[] }`，block 为 `{ id, type, settings }`。

**页头 / 页脚区**（`nav_json` / `footer_json`，各存**一串** section，出现在所有页面上）。
区域本体（下表两行）不可删不可移——它就是这个区域本身；其余段随便加随便排。
某个段能放进哪个区域由它自己的 `placements` 声明（`sectionTypesFor(area)` 读它），
所以「页头加公告条」= 往区域里加一段 `band`，不用给 header 的 schema 再长字段：

| type     | settings                                                                 | blocks                                                                |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `header` | show_logo, show_site_name, sticky, layout(split\|centered), `items`（导航条目）, **显示项三开关**（见下）, primary/secondary 按钮（都无默认值） | 无——导航即 `settings.items` |
| `footer` | show_logo, blurb, copyright                                              | `menu_column`{title, items}，最多 6：一列 = 标题 + 自己的导航条目 |

页头 / 页脚区渲染时**不许再包一层 `<header>` / `<footer>`**：`SiteHeader` 自己就是
`<header>`，外面套一层等高的祖先，`sticky` 就没有可粘的余量（sticky 只在包含块内部
移动），「吸顶」开关等于失效——编辑器预览若再包一层等高祖先就会犯这个错。
顺带也避免了嵌套 landmark。

### 站点导航（`shared/site-nav.ts`）

导航条目**直接嵌在**页头 `settings.items` 与页脚列块 `settings.items` 里，没有独立的
菜单实体 / key / 共享库。以前做过一份 `menus_json` 让页头页脚按 key 引用——「共用」
是真需求，但做成带齿轮切换的菜单库是过渡设计；现在页脚要和页头一样时**复制**一份
（编辑器「从页头复制」）。

条目形状：`{ id, source, label, href, category, expand, children[] }`。
建站默认页头是「全部一级页面」（flat）+「文档库」（children）：库空时文档那条不渲染，
有已发布文档后自动出现「文档」入口并链到 `/docs`。不把 `doc_index` 塞进一级页面目录。

| `source`       | 展开成                                       |
| -------------- | -------------------------------------------- |
| `link`         | 一条链接；可带**一层** `children` 做子菜单   |
| `pages`        | 全部已发布一级页面（取代 `show_site_nav`）   |
| `docs`         | 文档库目录，按分类分组                       |
| `doc_category` | 指定分类下的全部已发布文档                   |

动态项的 `expand`：`children` 收成可展开的父项，`flat` 就地铺平。展不出内容时**整条
不渲染**。编辑器（`SiteNavItemsField`，`type: "nav_items"`）用预设添加（链接 / 页面 /
文档 / 分类），展开方式默认按来源、收在「更多」里；分类只选自已有文档分类。

渲染两端同构：SSR 在 `sections/header|footer/html.ts`，SPA 在 `SiteChrome.tsx`，
都用原生 `<details>` 画下拉。chrome 的文档数据需求分两档（`resolveChromeDocs`）：
导航里的文档动态项、`doc-*` 段要**整份目录**（`chromeNeedsDocList`）；页头搜索只要
一个布尔值（`chromeShowsDocSearch`）。

### 文档搜索

**唯一入口是页头**（`header.show_doc_search`，默认开，站里没有已发布文档时不渲染）。
它是一个 `<form method="get" action="/docs">`，没有 JS 也跳得过去；落地由
`enhance/doc-search.ts` 接住：按每条 `<li>` 的 `data-doc-search`（SSR 用
`docSearchHaystack` 写入）过滤，并在列表上方画一枚「筛选：xxx ✕」的标签。

`doc-list` 段**不再自带搜索框**。它曾经有一个（`show_search`），于是文档索引上会
同时出现两个一模一样的框——页头那个跳过来，落进段里那个。现在段只负责列。

### 页头右侧的三个显示项

`show_locale_switcher` / `show_theme_toggle` / `show_account` 合成一组「页头显示」，因为
它们回答的是**同一个问题**：这枚入口露不露。能力本身另有出处，开关只管露不露，关掉
不等于关掉能力：

| 开关                    | 默认 | 能力由谁保证                                     |
| ----------------------- | ---- | ------------------------------------------------ |
| `show_locale_switcher`  | 关   | 本页 `alternates`——没译文时开了也不会露          |
| `show_theme_toggle`     | 关   | 明暗内置且**永远跟随设备**；关掉只是不给手动按钮 |
| `show_account`          | 开   | 租户是否开通会员（site-member）                  |

语言切换器曾经是站点级设置（`theme_settings.show_locale_switcher`），后来搬回页头并回填了
存量值。搬回来的理由是这四个开关本就该在一处配完，分成两处租户得跑两个地方排同一行按钮。

### 明暗模式

站点默认跟随访客设备，访客也可以手动改。公开站样式是**语义 class**（**不用 Tailwind**），
按 Shopify section stylesheet 模型共置为真 `.css`：`shared/site-css/base.css`（primitive /
`.sec*` / `.grp*`）、`shared/site-css/member.css`（会员入口 chrome）、
`shared/sections/_common/styles.css`（跨段 `.card` / `.grid` 等）、以及
`shared/sections/<type>/styles.css`（该段与其 block 专用）。段目录**靠扫描发现**，没有
需要同步的清单；`assemble.mjs` 压缩后写进 `marketing-site-css.generated.ts`——常驻部分是
`MARKETING_SITE_CSS_BASE`，各段样式按 type 落在 `MARKETING_SECTION_CSS`（Vite 客户端 /
esbuild SSR / Vitest 共用，勿在运行时 `fs` 读旁路 css）。改样式只改 `.css`，再跑
`pnpm --filter @be-water/modules assemble:marketing-css`。

**SSR 只发本页用到的段样式**：`ssr-render` 用 `collectSectionTypes()` 收齐页头 / 页脚 /
正文（含 `group` 列里的子段）的 type，交给 `loadMarketingSiteCssFor()`。顺序由
`MARKETING_SECTION_CSS` 的键序定、**不由页面上段的排列定**——让内容编排决定层叠顺序，
同特异性规则的胜负就会随租户拖拽而变。编辑器预览与 SPA shell 仍用全量
`loadMarketingSiteCss()`（那两处随时会加新段）。拆表的前提是段样式互不越界，由
`pnpm check:section-css` 守着（也跟着 `pnpm test` 跑）。主题色由
`marketing-site-theme` 注入 CSS 变量。工作台 `/app` 仍用 `index.css` + Tailwind。

**站点的明暗是自己一份，与工作台完全隔离。** 工作台走 `next-themes`
（`localStorage.theme` + `<html class="dark">`）；站点走
`client/lib/site-color-mode.ts`（`localStorage.site-color-mode` +
`<html data-site-color-mode>`）。两者同源同一个 SPA，共用一份存储的后果是访客在官网点
一下深色，租户下次打开管理台就是黑的——那是两个受众、两套偏好。编辑器预览 iframe 同样
读站点这份，不抄宿主的 `.dark`。

变量块（`marketingSiteThemeCss`）三条规则的次序不能动：设备偏好那条写成
`:not([data-site-color-mode="light"])`，否则深色设备上点「浅色」时，
`@media (prefers-color-scheme: dark)` 与基础规则同权重且排在后面，深色变量照旧生效，
按钮点了跟没点一样。SSR 在 `<head>` 里先跑一段
`marketingSiteColorModeScript()` 把偏好写到 `<html>`，避免首屏闪一下再纠正。

**租户显式配过的画布色两态都用**。`theme_settings.bg_color` / `fg_color` 是他自己挑的品牌
色，深色态不该把它悄悄换掉；只有没配过的（绝大多数站点只配主色）才落到内置中性色上，
于是深色设备拿到的是一张真正的深色页而不是白底。同理，section 级的 surface 颜色是内联
样式，两态都生效。

SSR 在 `show_theme_toggle` 时输出 `<button class="theme-toggle">`；点击与图标同步由
`site-enhance` 完成（语言切换器仍是纯 `<details>`，不依赖 enhance）。

### 会员入口（`show_account`）

未登录显示「登录」，登录后换成头像 + 账户下拉（账户页 / 退出登录）。

服务端注入点 `server/site-account-entry.ts`（`registerSiteAccountEntry`），site-member 在
`onBoot` 里填。它回答两件事：本站有没有账户能力（`available`），以及入口 HTML（登录链或
已登录菜单）。宿主口径：

| 宿主           | 数据来源                        | 渲染                                                              |
| -------------- | ------------------------------- | ----------------------------------------------------------------- |
| SSR 首屏       | cookie 会话 + 服务端注入点      | 未开通不输出；访客「登录」；已登录直接输出账户菜单并解锁门控正文 |
| 公开站交互     | site-enhance                    | 绑登出；SSR 仍是访客时用 cookie 探测 `/api/member/me` 升级菜单   |
| 主题编辑器预览 | `GET /api/site/capabilities`    | 开通了才灌 `SiteAccountEntryPreview`（slot）                      |

会员 JWT 在 HttpOnly cookie（`be-water_member_*`）里，随 HTML / XHR 同源发送；SSR 可
直接解锁。次按钮（secondary）**不**默认成登录：登录归账户入口管。

### 公开站 site-enhance（交互层）

nginx 把绑定域的**所有** HTML 文档反代给 Fastify SSR。公开站**不**注入 React SPA
（不再 `createRoot(#root)`）。交互由：

1. SSR 输出挂点（theme 按钮、`.member-entry`、`form.site-form`、`main[data-member-gate]`）
2. `<script defer src="/api/public/site-enhance.js?v=…">`——源码在
   `client/enhance/`，`pnpm --filter @be-water/modules assemble:site-enhance` 打成 IIFE
   写入 `shared/site-enhance.generated.ts`

| 能力         | 行为                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| 明暗         | 读写 `localStorage.site-color-mode`，同步 `data-site-color-mode`                |
| 表单         | 拦截 `.site-form` → `POST /api/public/site/form`                                |
| 账户菜单     | SSR 已登录则绑登出；否则 `credentials` 调 `/api/member/me`（可 refresh）升级    |
| 会员专属正文 | SSR 未解锁时 `credentials` 调 `GET /api/site/content/page-html` 写入门控 main |

`/app` `/login` `/register` `/member` `/platform` 仍走 SPA（`SITE_APP_PREFIXES` /
nginx / vite 代理三处对齐，由 `nginx-spa-prefixes.test.ts` 守住）。
若 SPA 内客户端导航误入公开 CMS 路径，`AppNotFoundRedirect` 会 `location.replace`
硬跳回 SSR 文档。

**页面级**（`placements` 含 `page`）。`band` / `prose` 三处都能放——通栏 CTA 摆进页头区
就是公告条，prose 摆进页脚就是备案号，不另造类型：

| type           | settings                                                               | blocks                                                                                  |
| -------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `hero`         | eyebrow, headline\*, subhead, align, show_glow, primary/secondary 按钮 | `stat`{term\*, detail}，最多 4                                                          |
| `feature-grid` | 抬头, columns(2–4), show_icons                                         | `feature`{icon, title\*, body}，最多 12                                                 |
| `steps`        | 抬头, primary 按钮, columns, show_number                               | `step`{title\*, body, code}，最多 8                                                     |
| `spec-list`    | 抬头, primary 按钮, layout(split/stacked)                              | `row`{term\*, detail}，最多 12                                                          |
| `cards`        | 抬头, columns, card_style                                              | `card`{title\*, body, href}、`stat`{value\*, label}，最多 12                            |
| `page-menu`    | 抬头, source(children\|siblings), style(list\|cards), columns          | —（动态菜单：父页 children / 子页 siblings；条目来自已发布 `site.pages`）               |
| `pricing`      | 抬头, columns, footnote, featured_badge                                | `plan`{name\*, audience, price, price_note, highlights, featured, primary 按钮}，最多 6 |
| `faq`          | 抬头                                                                   | `qa`{question\*, answer}，最多 20                                                       |
| `page-header`  | headline, subhead, align（留空回落到页面 meta）                        | —                                                                                       |
| `prose`        | body_md                                                                | —                                                                                       |
| `group`        | columns_layout(12 栏份额), column_gap, align_items                     | `column`{sticky, show_divider + 线型/粗细/颜色, stack_order}，最多 4；**容器 block**，见下 |
| `band`         | headline\*, body, align, primary/secondary 按钮                        | —                                                                                       |

`*` = `required`，为空时该 section 校验失败。

**页面标题不再自动渲染**。以前非首页且首段不是带 headline 的 hero 就自动输出 h1 + 描述
（`sectionsLeadWithHero`）——标题出不出现取决于第一段碰巧是什么类型，租户在树上看不见、
也删不掉、更换不了位置。现在它就是 `page-header` 这一段：能排序、能删、能对齐。
文案留空时回落到页面 meta 的 title/description（`resolvePageHeaderText`，客户端与 SSR 共用
同一份，否则两边算出的 h1 会不一致），所以「新建页面自带标题」这个便利没丢，也不用把标题抄两遍。
存量页面由 `20260805010000_marketing_page_header_section` 在原本会自动出标题的页面前面补一段，
已发布官网的 h1 不会静默消失。

**`group` 是唯一的分栏原语**：一段里并排 2–4 列，列是 block、列里装任意子段
（`SiteBlock.sections`，由 `BlockDefinition.container` 声明）。列宽是 `columns_layout`
里的一份 **12 栏份额**（`"3:7:2"`），编辑器画成一条多滑块——拖的是列与列之间的界线，
所以总宽天然守恒，配不出「加起来不满一行」的版式。份额与实际列数对不上时按列数等分
回落；加 / 删列时 `refitGroupSpans` 会把份额顺过来（加列从最宽那列匀一半，删列把宽度
并进最后一列），否则租户没碰过列宽却会看到它跳成等分。窄屏一律上下堆叠，顺序由列的
`stack_order` 调。

**分隔线逐列独立**：`show_divider` 在这一列右侧的间隙正中画一条竖线（最后一列不画——
它右边没有要分开的东西），线型 / 粗细 / 颜色（`divider_style`、`divider_width`、
`divider_color`）也都挂在列上，所以一段里几条线可以各画各的。三者落成列上的 CSS 变量
（`--grp-divider-*`，`groupColumnCss`）而不是一串类名——粗细是连续值、颜色更是任意值，
类名枚举不出来；默认值写在 CSS 的 `var()` 兜底里，没配过的列连 `style` 属性都不会多。

线**恒铺满整行的高**，与 `align_items` 无关：开了线的列自己 `align-self: stretch`。
吸顶列也一样——吸的是列里多包的那层 `.grp-col-inner`，列这个盒子照常拉伸（让列自己
`position: sticky` 就得 `align-self: start`，线会缩成内容那么长）。

`columns_layout` 曾经是个七选一的**比例**预设（`1:3` 等），`resolveGroupSpans` 靠
「几个数加起来是不是 12」区分两种写法——不是 12 就查那张旧比例表。留着它是因为改版
之前存下来的页面不该在某次发布后无声无息地变成等分。
**嵌套只允许一层**——容器段不能装容器段，写路径抛 `site.sections_invalid`、读路径跳过，
编辑器的加段菜单里也不列出容器段。列内子段自动 `contained`：`width: full` 退化为 `page`、
不再自带左右 gutter（列已经限过宽）。「左侧同级菜单 + 右侧正文」的文档版式 = `3:9` 的
group + 左列放 `page-menu`(siblings/list, 列上勾 sticky)，不再有专门的侧栏机制。

每个页面级 section 另有一组**通用版式**（`layoutSettings()`，编辑器「版式」页签）：
`width` · `content_width` · 盒模型留白（`padding_top/right/bottom/left` +
`spacing_above` / `spacing_below`，外左右不做）· `divider`(none/top/bottom/both) · `anchor`。
以及一组**通用外观**（`styleSettings()`，编辑器「外观」页签）：
`bg_color`（外背景，色块外壳 / `.sec-band`）· `inner_bg_color`（内背景 + 内边距环，正文区 / `.sec-content`，仅页面 section）·
`fg_color`（`#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA`，可带 alpha）·
`border_color` · `border_width` · `radius`（可继承）。
外背景与内边距互不重叠：padding 落在正文层，补白环显示内色；外色只铺色块，正文限宽时两侧可露出。
空外背景 = 无自定义色块底；旧 `background` token（muted/accent）仍可兼容渲染，
`outline` 迁移为边框。band 新建默认写入内部 `background: muted`。
块级 / 页头页脚只有一层 `bg_color`（无内外之分）。
页签为内容 / 版式 / 外观三栏；窄侧栏未激活页签只显示图标。
所有留白存的都是**桌面 px**，窄屏两处渲染统一 ×0.7；`anchor` 归一化成 slug 后作为
`<section id>`，供页内导航链 `#anchor`。

页头 / 页脚本体、卡片类 block（feature / card / plan / qa 等）同样挂 `styleSettings()`。
站点主题另有整站画布 `bg_color` / `fg_color`；页面设置可覆盖正文区画布色。

### 多语言

URL 对齐 Shopify Markets：站点**主语言不带前缀**（`MarketingSite.default_locale`，SEO 主入口），
其余语言走 `/{locale}/…` 子目录。路由规则集中在 `shared/site-locale.ts`（排除应用区前缀，
不靠页面白名单）。locale 的 slug 占住了 `RESERVED_PAGE_SLUGS`，否则一个叫 `en`
的顶层页会把整棵 `/en/*` 遮住。

存储按「授权单位 = 本地化单位」分两种：

| 内容                    | 存法                                             | 理由                                               |
| ----------------------- | ------------------------------------------------ | -------------------------------------------------- |
| 页面（`MarketingPage`） | **一语言一行**，`@@unique(tenant, slug, locale)` | 各语言的 section 编排本来就可以完全不同            |
| 站名 / 页头 / 页脚文案  | **逐字段** `{ __i18n: { [locale]: text } }`      | 全站共用、结构必须一致，只是标签换词（同 Shopify） |

翻译组的 key 是 `(kind, slug)`——同 slug 的不同语言行天然成组，不需要额外关联列，
`hreflang` / 语言切换器 / sitemap 的 `xhtml:link` 都由它算出。

读路径的**语言投影只有一处**：`toPublicMarketingSite` / `toPublicMarketingPage`
（内部走 `localizeSection`）。压过之后 `settings[id]` 恒为标量、站内 href 已带前缀，
两处渲染与所有 `settingText` 调用方都不必知道多语言的存在。管理端读路径**不压**——
编辑器要拿整张 `__i18n` 表。

- 请求语言一篇内容都没有 → 整站回落主语言，canonical 指回无前缀 URL
- 该语言有内容、只是这一篇没译 → 404（不拿另一种语言的正文冒充）
- 某字段缺译文 → 回落主语言原文，不留白
- **不**按 `Accept-Language` 自动跳转：那会让爬虫只看到一种语言

页头的**语言切换器**是页头 section 的一个开关（`show_locale_switcher`，与站点导航 / 明暗 /
账户入口同组，见上）。候选语言逐页算（`page.alternates`），只列真的有已发布译文的语言
——所以单语言站点即使把开关打开也不会露出按钮。

单语言站点的数据形状与以前逐字节一致：只有真的填了第二种语言，文案字段才从纯字符串
升级成 `__i18n`（见 `writeLocalizedSetting`）。

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
通栏色块是方角（贴视口边的圆角会露缺口）；切底色不会让正文横向位移。

### 间距：段内 padding + 段间 spacing

两者互不相扰，这是 Shopify 的分工：`padding_*` 是色块**内**的留白（底色包住），
`spacing_*` 是段与段之间的缝。段间距默认继承主题的「区块间距」，档位下限（哨兵 `-4`）
表示继承——和 padding 用同一种控件、同一个单位，租户不用先分清概念。

编辑器里这六个值合成一个盒模型控件（`theme-editor/SpacingBoxField.tsx`，schema 里是
`spacing_box`，写入时由 `applySpacingBox()` 展开回六个独立键）。每格都是「可拖的数字」：
拖动（3px 一档，横向格看 x、纵向格看 y，统一**向上 / 向右为加**，跟 ArrowUp 一个方向）、
方向键（一档，Shift 四档）、直接打字（草稿态，失焦 / 回车才吸附提交——逐字符 clamp 的话
「12」会在敲下「1」时被吸成 0）。清空 = 回档位下限，段间距那两格即回到「继承」。
指针停在哪格，盒子对应的那条边就点亮。中间两个联锁开关（↔ / ↕）各管一条轴：按下后该轴
两条对边一起改，两个都按 = 锁全部，都不按 = 不锁（纯编辑器态，不落库）。字段说明与操作提示
收在标签后的 `FieldInfoTip` 气泡里，不占版面（口径见 `ui-components` rule）。

一条缝由相邻两段共同决定：**显式覆盖压过继承**，两边都显式时取较大的一方。不能无脑取 max——
那样某段设成 0（想和上一段拼成连续色带）会被邻居继承来的主题值挡住。缝隙由
`resolveSectionGaps()` 显式算好落到后一段上，**不靠 margin 折叠**：折叠依赖包装层没有
padding/border/overflow，哪天有人加一句 `overflow-hidden` 就会静默翻倍。

### 编辑器预览

预览跑在 **iframe** 里（`theme-editor/PreviewFrame.tsx`）：站点断点是视口媒体查询，
只缩容器宽度并不会触发移动端样式。内容用 `createPortal` 挂进 iframe 的 body，
所以预览和编辑器仍是同一棵 React 树——选中态、草稿、点击选区块都不用另接通道
（React 会给 portal 容器单独挂事件监听，跨 document 的点击照样触发）。
iframe **只**注入 `MARKETING_SITE_CSS` 与主题变量，**不**克隆工作台 `index.css` /
`data-theme`；明暗按访客 `localStorage.theme` + 系统偏好，与实站同构。

设备档位是**逻辑视口宽度**（桌面 1280 / 平板 768 / 手机 390），面板装不下时整体
等比缩小：缩放只改视觉尺寸，iframe 仍按逻辑宽度渲染，断点不受影响。桌面不能
「面板有多宽就多宽」——中间栏只有 600～800px，那样 `lg:` 永远不触发。

**选中高亮画在 iframe 外面**（`PreviewFrame` 的 overlay，按 `data-section-id` /
`data-block-id` 取矩形再乘缩放比）。画在里面躲不开三件事：macOS 覆盖式滚动条会盖住
最右侧十几个像素、祖先的 `overflow`、以及 sticky 页头的层叠上下文——通栏 section
（`width: full`）的边缘首当其冲。放到宿主文档后，站点渲染组件（也服务于公开站点）
就不再带任何编辑器样式，只留两个 data 属性与点击回调。矩形随滚动 / 面板缩放 /
内容编辑重算，用 rAF 合并。

高亮只有 **1px 半透明 ring + 极淡填充 + 一枚类型名标签**。它是「我改的是这一块」的
提示，不是内容的一部分：原来那圈 2px 实色边框加内环会盖住段落自己的圆角与分隔线，
租户看到的排版和访客看到的差出好几个像素——预览失真比标注不明显更糟。

**块也能选**。选中 block 时它是主高亮，所属 section 退成更淡的框做上下文。渲染层
给每个 block 打 `data-block-id`，点击统一在**段**这一层从事件目标 `closest` 上溯到最近的
块（`resolveClickedBlockId`）——block 的渲染散在十来个视图里，逐个挂 onClick 必漏，
而「卡片整块是 `<a>`」的那几种还会先把事件吃掉。找到的元素不在本段里（分栏段的外层）
就当没点中；判空用 `closest` 是否存在而**不是** `instanceof Element`，预览在 iframe 里
是另一个 realm，`instanceof` 恒为 false。iframe 内另加一条 hover 虚线提示哪些是可选单元
（这份 CSS 只在编辑器的 iframe 里，不进公开面）。

**加一段 = 四个文件 + 三处登记**，没有任何 switch 要改：

| 文件                                                   | 内容                     |
| ------------------------------------------------------ | ------------------------ |
| `shared/sections/<type>/definition.ts`                 | schema 声明              |
| `shared/sections/<type>/html.ts`                       | SSR 渲染（SEO 正文以它为准） |
| `shared/sections/<type>/styles.css`                    | 该段 / block 专用语义 CSS（可仅注释） |
| `client/components/sections/views/<type>.tsx`          | SPA React 视图           |

登记在 `shared/sections/index.ts`（声明表）与 `shared/sections/html.ts` +
`client/components/sections/section-views.ts`（两张渲染器表）；`styles.css` 不用登记，扫目录
就发现了，放完跑 `assemble:marketing-css`。**两端渲染必须同构**：一段的
文件按 type 并置，漏改一端在 diff 里看得见。客户端与服务端各有一张渲染器表，是因为两侧本
就是两个 bundle（React 视图进不了 Fastify），与 `site-account-entry` 的 client / server
双注入点同一形状。

跨段共用 class（`.card`、`.grid`、`.spec` 壳、`.brand` / `.logo` 等）进
`_common/styles.css`，**不要塞进某一个段**：SSR 按需发 CSS，用了别段的类就会在「有 A 没 B」
的页面上裸出来。这条由 `pnpm check:section-css` 强制，越界会指名道姓报出来。

新增 setting 类型再在 `SettingsFields.tsx` 加一个分支。
`label` / `content` 存的是 i18n key（`marketing` namespace 下相对 key），shared 层不含展示文案。

`header` / `footer` 是站点级 chrome，不进段流：它们的渲染在
`shared/sections/{header,footer}/html.ts`（SSR）与 `SiteChrome.tsx`（SPA），
不套 `sec-band` 外壳，也不在上面两张渲染器表里。

#### 业务模块贡献 section

段不必都住在 marketing 里。业务模块可以贡献自己的段，方向与 `site-account-entry` 一致：
**注册表定义在消费方**（marketing），模块自己把定义填进来；marketing 不知道任何业务模块的
存在，也不反向 import。首个真实用例是 site-member 的「会员专属内容」段。

一个贡献段要三样东西，**定义只写一份**（放贡献方的 `shared/`，两端 import 同一个对象）：

| 位置 | 做什么 |
| --- | --- |
| `<模块>/shared/xxx-section.ts` | `SectionDefinition`（type 必须带模块前缀） |
| `<模块>/server/…` → `registerSiteSectionHtml(def, render, { css })` | 在 `onBoot` 里注册 SSR 渲染器 |
| `<模块>/client/module.tsx` → `registerSiteSectionView(def, View, { css })` | 注册编辑器视图 |

**为什么是两次注册而不是一次**：客户端与服务端本来就是两个 bundle，React 组件进不了
Fastify。两边 import 同一份 definition，所以 schema 只有一处，不会漂。

**type 必须带模块前缀**（`site-member.gate`）：段 type 会落进租户页面的存储里，两个模块
撞名的后果是页面内容被另一个模块的 schema 解析——所以注册表对撞名**直接抛**，启动时炸掉
远好过在某个租户的页面上悄悄错乱。

**entitlement**：定义里声明 `entitlement`，租户没开通就不进「添加区块」菜单
（`/api/site/capabilities` 回传已开通列表），也不渲染（`SectionRenderContext.enabledEntitlements`，
由 `site-entitlements.ts` 按租户解析）。渲染器是**进程级**注册的、开通与否是**租户级**的，
所以闸门只能在渲染时按租户拦。忘了传集合按「都没开通」处理——少了而不是多了。

**CSS** 随注册一起交进来：内置段的样式构建期就打进 `MARKETING_SECTION_CSS` 了，贡献段进不了
那次打包，所以运行时注册进来、一律拼在最后（覆盖内置类时不必打优先级战争）。贡献段同样
**按需**发：这一页没上它就不发（见 `loadMarketingSiteCssFor`）。

**停用之后不丢内容**：模块被移除或租户退订时，页面上已经摆好的那一段走下面的
`unsupported` 口径原样兜住，重新启用就自动回来。这是这个契约敢用的前提。

用例见 `shared/section-contribution.test.ts`。

#### 撞见不认识的段

页面里可能存着这份代码解析不了的段：模块停用、租户退订、或页面是更新版本写的。
口径分两种，别混：

| 情况                              | 读路径                               | 写路径 |
| --------------------------------- | ------------------------------------ | ------ |
| **type 完全不认识**               | 包成 `unsupported` 占位，**原样兜住** | 拒收   |
| **type 认识、但不该放在这个位置** | 丢掉                                 | 拒收   |

**兜住**是因为「停用模块 → 打开编辑器看看 → 顺手保存」是最常见的一串操作，静默丢掉
等于一次保存就永久烧掉内容，重新启用模块也回不来。占位把原始条目原封不动放在
`section.source.raw` 里，写路径原样回存；等 type 重新被认识，解析时自动复活成真正的段
（`parseUnsupported`），不留痕迹。**丢掉**则是因为 `placements` 写死在代码里，没有任何
模块开关能让 `pricing` 变成合法的页头段——兜着它也永远复活不了。

**拒收**是因为编辑器手上的未知段一定已经是占位（读路径给的），写路径上再冒出一个裸的
未知 type，只可能是客户端 bug 或构造的请求。

占位两端都不渲染（不在任何渲染器表里），公开页与 SSR 一致——不可用不等于露出半个坏掉的
段。编辑器里它照常出现在段树上（警示图标），能选中、能删，设置面板给一句说明而不是空白。
`placements: []` 保证它永远不出现在「添加区块」菜单里。

一段坏了也不再连坐：页头 / 页脚以前是「一段解析失败 → 整个区域重置成默认」，现在逐段跳过。

用例见 `shared/unsupported-section.test.ts`。

未知 block type 直接丢弃；`safeSections` 只跳过损坏的单个 section，不再整页清空。

路径约定：`home` → `/`；`page` → `/{slug}`（slug 可多段，如 `guide/quickstart`）。
`pricing` 不在保留 slug 里——绑定域名上归租户（平台页只在平台域名下有意义）；
`docs` **是**保留的，归租户文档库（见下）。

**动态页面菜单**：在 Theme Editor 插入 `page-menu` section——父页选 `children`，子页选
`siblings`；条目随已发布页面目录自动更新，无需手填链接。要做成左侧栏就把它放进
`group` 的第一列（`3:9` + 列 sticky），没有 chrome 级的自动侧栏。

### 文档库（`MarketingDoc`）与它的两张模板页

文档**内容**不进 section 体系：一篇就是「标题 + Markdown + 分类」，存在 `MarketingDoc`
表里，有自己的 draft/publish 语义（`shared/marketing-doc.ts`）。文档**版式**则完全在
section 体系里，靠两张模板页承载：

| kind | 地址 | 干什么 |
| --- | --- | --- |
| `doc_index` | `/docs` | 文档目录页的版式 |
| `doc_article` | `/docs/:slug` | **所有**文档详情共用的一张版式 |

两张页的 slug 固定（`docs` / `docs-article`），和 `home` 一样由 kind 决定；它们**不进页面
目录**（不出现在「全部一级页面」、`page-menu`、sitemap 的页面部分里）——`doc_article` 根本没有
自己的地址，`doc_index` 的导航入口走页头 `items` 里的 `docs` 动态项（建站默认就有；库空时不渲染），
而不是因为「碰巧自定义过版式」就自动冒出来。

**默认不落库**：库里没有这两条记录时，SSR 直接按内置兜底版式渲染
（`DOC_TEMPLATE_PRESETS`，见 `shared/page-presets.ts`）。所以新租户零配置就有能用的文档站，
存量租户也不需要数据迁移。租户在站点页面列表底部的「文档版式」两行点「自定义版式」，
才从兜底版式复制出一条真实页面记录，之后就是普通页面的编辑 / 发布流程。

四个段消费文档数据（数据经 `SectionRenderContext` 的 `docs` / `doc` 注入）：

| 段 | 画什么 | 数据 |
| --- | --- | --- |
| `doc-list` | 文档目录（分组 / 卡片 / 列表、可按分类筛、可限条数） | `ctx.docs` |
| `doc-article` | 当前这一篇的正文 | `ctx.doc` |
| `doc-nav` | 篇与篇之间的导航（当前篇高亮） | `ctx.docs` |
| `doc-toc` | 一篇之内的章节导航，从正文标题现抽 | `ctx.doc` |

「导航菜单 / 章节导航要不要显示」因此不需要额外开关——**就是这一段加不加**。
`doc-list` 放在任意普通页面上同样可用（首页放 `limit=3` 就是「最新文档」）；`doc-article`
/ `doc-toc` 离开详情模板页就什么都不渲染，因为那时没有「当前文档」。

普通页面只有在页面 / 页头 / 页脚里真的摆了 `doc-*` 段时才会去查文档表（见
`ssr.routes.ts`），不给每次页面渲染都加一条 SQL。

**链接到文档**：`link` 类型的设置项（页头导航链接、页脚链接）在编辑器里带一个下拉，
候选是站内页面 + 文档索引 + 每一篇文档（`GET /api/site/link-targets`）。存的仍是一个
普通 href 字符串，渲染端零改动。

**管理页**（`/app/site/docs`）：列表 + 编辑弹层两件套。

- 列表接口 `GET /api/site/docs` 一次返回全量，搜索 / 分类 / 状态 / 排序 / 分页切片
  都在客户端做（`client/lib/site-doc-list.ts`），但 **page / page_size / 筛选 / 排序
  一律走 URL**（`use-site-docs-page.ts`，与 `useUsersPage` 同口径），不另搞本地分页
  模式。状态筛选里的 `dirty` 不是文档状态，是「已发布但草稿有改动」这一条横切条件
- 编辑用 `SiteDocEditorSheet`，**弹层态 / 全屏态双模式**：同一棵 DOM 只换
  `SheetContent` 宽度与正文区预览布局，切换时 textarea 不重挂，光标与撤销栈都还在；
  展开偏好记在 localStorage。表单只写草稿列，保存后仍需发布才上线
- 列表里的路径只作展示不做链接：站点跑在租户自己的域名上，管理端拼不出可点的绝对地址

### Theme Editor

`/app/site/pages/:pageId` 三栏：

- **左**：页面 / 页头 / 页面区块 / 页脚四组。最上面「页面」那一行不是 section，是**页面自己**（标题 / SEO 描述），选中后右栏出 `PageMetaForm`——改元数据不用退回页面列表，且即时反映到中间预览。其余三组是区块树（对齐 Shopify sections group），section → blocks 两层，容器段再多一层（列 → 子段 → 子段的 blocks），增删排序都在这里；页头页脚不可删不可移。树上的操作一律**按 id 定位**（`client/lib/section-schema.ts`），不用下标——下标只在自己那一层有意义
- **中**：同页预览（`TenantSiteView`），点击任意区块即选中；点在某个 block 上直接选中该 block，点在段的其余部分选中整段
- **右**：由 schema 渲染的设置面板（选中 section 或 block）

**区块的搬移**（`moveSectionTo`）：落点按指针在目标行的上半 / 下半算，插到那一段前 / 后；
section 能跨层搬——页面顶层 ⇄ 分栏的列，是「摘掉再插回去」而不是同层换位，所以同层换位
也走它（那本来就是同层的摘+插）。搬移**不动 settings**：列内子段的 `contained` 收窄是
渲染期的事（`SiteSections`），不落库。两条规矩违反了就原样返回，UI 也同步拦一道
（`acceptsSection`，落不下去比落下去被静默丢弃清楚）：

1. **嵌套只允许一层**——容器段进不了任何列，否则服务端 `site.sections_invalid` 拒收整棵树
2. 不能拖进自己的子树里——搬完自己就没地方挂了

配套的两处，缺了拖放就是半残：**空列**（新建的分栏正好是两个空列）一行都没有、接不住拖放，
所以拖起一段能进列的区块时给它渲染一块放置区（`ColumnDropZone`）；同时把所有分栏段摊开
（`revealColumns`）——拖到一半手是松不开的，没法先去点开它。

> **别在 `dragstart` 里同步 setState**（`beginDrag` 推迟一帧，有回归测试盯着）。
> React 对 `dragstart` 这类 discrete 事件同步 flush，处理器里 setState 会当场改 DOM，
> 而浏览器此时还没把拖拽会话建起来——Chrome / WebKit 直接中止这次拖拽。
> 症状极具迷惑性：**只有带分栏的页面整个拖不动**（只有它会因 `revealColumns` 插节点），
> 没有分栏的页面一切正常。jsdom 没有真正的拖放实现，测不出来，只能测「dragstart 当场不动 DOM」这个不变量。

block 不跨层：它的 schema 属于所在 section，一个 `card` 换不到 `faq` 段上去，
`reorderBlock` 用 `reorderItem` 认死同一个列表。

排序两条路：拖放 + 上下移按钮。上下移只在自己那一层内动，**跨层只能靠拖放**——
曾经为此加过一个行内「移动到」下拉，但拖放通了之后它就是重复入口，为它在每行挂个菜单不划算，已删。

左树的选中项因此是个判别联合（`ThemeEditorSelection`）：`meta` 或某一段 / 某个 block。

设置面板的「内容 / 版式」页签按**该 section 真有没有字段**渲染：只有一组有字段就直接铺开不套页签
（如分栏段设置全在版式下），两组都没有则只显示一句提示。只剩分组抬头的一组算空组。

保存一次写页面 sections 与页头页脚草稿：`PUT /api/site/pages/:id/draft`（`saveEditorDraft`，同事务）。
页头页脚上线：`POST /api/site/chrome/publish`（将草稿列复制到 `nav_json` / `footer_json`）。
已发布页面正文上线：`POST /api/site/pages/:id/content/publish`（将草稿列复制到 `title` / `description` / `sections` / `settings`）。
首次发布页面：`POST /api/site/pages/:id/publish`（`status` → `published` 并同步正文草稿）。

**撤销未发布的草稿**是发布的反向，两级各有入口（都在工具栏「更多」里，按需出现）：

| 撤到哪儿             | 入口                                            | 条件                     |
| -------------------- | ----------------------------------------------- | ------------------------ |
| 内存 → 已保存的草稿  | 纯前端（清 sessionStorage 缓存后重新灌入）      | `dirty`                  |
| 页面草稿 → 线上      | `POST /api/site/pages/:id/content/revert`       | 页面 `published` 且脏     |
| 页头页脚草稿 → 线上  | `POST /api/site/chrome/revert`                  | `chrome_dirty`           |

服务端两条 revert 是 publish 的镜像：把无后缀列回灌进 `_draft` 列。页面级那条只对
**已发布**页面开放——没上线过的页面，无后缀列里躺的是建页初值，拿它当还原目标只会
给出一个用户从没见过的版本。可撤性由 `resolveEditorPublishState` 与发布态一起算出
（`canDiscardLocal` / `canRevertContent`），工具栏只负责渲染。
图片上传：`POST /api/site/assets` → 公开 URL `/api/public/tenants/:slug/site-assets/:filename`。
草稿预览 API：`GET /api/site/preview?path=`（需 `site.read`，含 draft 页面 + 草稿 chrome）。

顶部工具栏是**页面级**操作区：页面切换器（`PageSwitcher`，只列同语言的页面，改完一页直接切下一页）、
语言按钮组、复制、预设、发布、保存。整页替换 sections 的「预设」放这里而不是区块树里——
它与「添加区块」不是一档操作，挨着摆成同样的下拉太容易误点。

编辑器状态全在本地草稿里，**离开就丢**（返回列表 / 换页 / 换语言都是重新加载），
所以这三处导航统一走 `leaveTo()`：`useSiteThemeEditor` 用灌入时的快照算 `dirty`，脏了先弹确认。

**复制页面**（`POST /api/site/pages/:id/duplicate`，只要标题 + 目标语言）：区块结构照搬，
复制件一律是**草稿**。文案会把源语言槽位里的原文搬进目标语言槽位（`relocalizeSections`）——
编辑器读的是「当前语言的槽位」且刻意不回落，不搬的话复制出来在编辑器里是一片空白，
而复制的用途恰恰是拿原文当翻译起点。slug 不让填：`(kind, slug)` 是翻译组的 key，
复制到别的语言必须沿用源 slug 才能自动成组；目标语言已占用该 slug 时（即同语言复制）
才派生 `about-copy` / `about-copy-2`，首页因为 slug 固定为 `home` 直接返回 `site.home_exists`。

**页面预设**（`shared/page-presets.ts`，客户端 re-export）一键铺出默认官网版式：首页 / 定价 / 文档 / 关于 / 联系。
预设只描述结构 + i18n key，文案在创建时用 `t()` 落成当前语言的普通内容，套完随便改。

**站点起步模板**（`shared/site-starters.ts` + `SiteStarterMenu`）在页面列表一键铺好页头 / 页脚 /
主题色，并在主语言下创建或更新**首页**（复用页面预设）。应用走
`POST /api/site/starters/:key/apply`，chrome 与页面**同一事务**落库。

起步模板刻意很轻：首页只有 hero / 三项功能 / CTA 三段，文案是可替换的占位，
页头不预设按钮、页脚不预设链接组，且不再顺带建 docs 与 pricing。那三样是**本仓自己**
官网的结构与文案（写死了 Fastify / Prisma / `pnpm gen:module`），真实租户拿到手第一件事
是删。想要文档 / 定价 / 关于 / 联系的从「页面预设」里按需加，预设都还在。

模板里的链接也不能写死站内地址：起步只建首页，别处都指不到；`/register` 更是
**工作台的员工注册页**（`apps/client/src/shell/guest-routes.tsx`），租户站点的访客点进去
会看到 SaaS 运营方的注册表单。首页 CTA 因此走页内锚点（`#contact` → band 段的 `anchor`），
`SiteLink` 会把 `#` 开头的 href 原样交给 `<a>`，不再当相对路径去补 locale 前缀。

**站点主题**（Logo / 主色 / 字体 / 页宽 / 区块间距）已从编辑器移出，并入「系统管理 → 品牌」（`/app/settings`）：
`platform` 开 `settingsBrandingExtraSlot`，本模块通过 `client.shell.shellProviders`
注入 `SiteThemeCard`（`platform` 不得反向 import 业务模块）。未开通 `tenant-marketing`
的租户不渲染该卡片也不发请求。

`theme_settings` 是站点主题的**唯一真相源**——`logo_url` / `primary_color` 曾经另有独立列，
已由 `20260804020000_marketing_site_theme_only` 回填后删除；API 上的同名顶层字段是派生值。

**官网 logo 默认继承租户品牌资产**（platform 的 `branding` 设置），`theme_settings.logo_url`
只是可选覆盖。回落只发生在**公开面**（`toPublicMarketingSite`）与编辑器预览
（`use-site-theme-editor` 用 `useTenantBranding` 自己兜）：管理端 `toMarketingSite` 必须保持原样，
那份数据要灌进设置表单，填进去一存就把继承关系写死了。也**不能**直接拼公开路径当默认值——
没上传过资产时那个端点是 404，会渲染成破图，所以要真读一次 branding 设置。

API：

- 租户：`/api/site`、`/api/site/capabilities`、`/api/site/pages…`（含 `POST /pages/:id/duplicate`）、`/api/site/preview`（权限 `site.read` / `site.write`）
- 公开：`GET /api/public/site`、`GET /api/public/site/page?path=`
- Entitlement key：`tenant-marketing`

现有租户管理员补权限：`pnpm --filter server exec tsx scripts/sync-builtin-admin-permissions.ts`

## 主题包与起步模板

**主题包 = 一组 `theme_settings` 预设值**（`shared/site-themes.ts`：default / docs / bold /
minimal），套用时直接写进站点的 `theme_settings`。

**刻意不做成运行时的一层**（包的值 + 租户覆盖）：那样每个读 token 的地方都要处理级联，
而租户改完一个颜色后「到底哪一份在生效」也说不清。写下去之后 `theme_settings` 始终是唯一
真相源，「我改了主色」的行为就和它看起来的一样。代价是套用新包会**覆盖**已有微调——所以
确认框里写清楚了，而不是悄悄换掉。

包里**只有外观 token**，不含 `logo_url` / `og_image`：那是品牌资产不是风格，换配色不该把
logo 抹掉（`applySiteTheme` 显式把它们保留下来）。

**起步模板 = 主题包 + 页面组合**（`SITE_STARTERS`：default / product / docs / landing）。
都用同一批 `PAGE_PRESETS` 与 `SITE_THEMES` 拼，加一种 vertical 不用写新代码，只多一条声明。
`buildSiteStarter` 对不认识的 key 返回 `null` 而不是回落成默认模板——静默回落会让人以为
自己选的模板生效了。

页头 / 页脚各模板暂时共用一套：区别在页面组合与主题，不在 chrome 结构。真需要不同页头的
那天再给 `SiteStarter` 加字段，不先造一层用不上的抽象。

用例见 `shared/site-themes.test.ts`。

## 版本历史

草稿 / 线上两列与版本历史是**两回事**：那两列回答「有没有未发布的改动」（撤销只能回到
最近一次发布），`MarketingPageVersion` 回答「上周三线上是什么样」。

- **只在发布时留档**。草稿保存是每敲几个字就发一次的自动动作，逐次留档会把历史淹没在
  几百条无意义的中间态里；发布是一次有意的「就它了」。
- **留档与发布同一个事务**。分开写的话，发布成功而留档失败会出现一版上线过、但历史里
  查不到的内容——回滚时看到的版本列表就是错的。
- **存完整正文，不是 diff**。逐版存 diff 要在读取时按序重放，中间任何一版损坏就全线报废；
  一页正文才几十 KB，直接存整份换来的是「任何一版都能独立读出来」。
- **恢复只落草稿，不动线上**。直接覆盖线上等于一键把访客看到的页面换成三周前的样子，
  没有复核余地；落草稿后能先预览再决定发不发布，而发布又会留下新的一版，恢复错了也退得回去。
- 每页保留 50 版，**按 `version` 修剪**而不是按时间戳（同一毫秒连发两次会撞时间）。
- 读某一版时按**当前**这份 schema 重新解析：期间删掉的段走 `unsupported` 兜住，不会让
  一版历史整个打不开。

用例见 `server/site-page-version.service.test.ts`。

## 媒体库

上传以前只落盘、不落库：URL 一旦从编辑器里删掉，那个文件就再也找不回来，也没人知道它还
在不在被引用。`MarketingAsset` 这一行才让「列出来、复用、删掉、写 alt」谈得上。

- **落盘再落库**。反过来的话，写库成功而落盘失败会留下一条指向不存在文件的记录——媒体库
  里一张永远加载不出来的裂图，比多一个没人引用的孤儿文件难处理得多。删除时相反：先删库
  再删盘，删盘失败也算删成功（目标是「媒体库里不再有它」）。
- **`alt` 存在 asset 上**，不随每个引用点各存一份：同一张图在十个地方用，无障碍文案不该抄十遍。
- **像素尺寸靠读文件头**（`server/image-dimensions.ts`，PNG / GIF / WebP / JPEG），
  不引 sharp：唯一用途是选图器里显示一行 `1200 × 630`，为它加一个原生依赖会把镜像和
  构建时间都拖上一截。认不出来（SVG）存 0。
- **删除不检查引用**。引用散在 section settings 的 JSON 里、还分草稿与线上两份，富文本里
  手写的 URL 更扫不到——与其给一个似是而非的「安全」承诺，不如在确认框里说清楚不可逆。
- **所有吃图片地址的字段统一用 `SiteImageField`**（文本框 + 选图 + 预览）：站点 logo、
  站点 / 页面的分享图、以及 section 的 `image` 设置。留一个裸 `<Input>` 在那儿等于让租户
  自己去别处复制 URL 再粘回来，媒体库就白建了。仍然保留手填——CDN 上的外链图不该被强制
  先传进媒体库。
- 选图而不是直接上传：同一张图在多处用是常态，每次都重新传只会堆出一堆一模一样的文件。
  弹层里照样能就地上传，传完直接选中。

> 目前**没有内置 section 声明 `image` 设置**（站点上唯一的图是页头页脚的 logo）。
> `SiteImageField` 已经接好，加一个带图的段（媒体位 / hero 背景）时不用再碰这一层。

**未做：多尺寸派生（responsive srcset）。** 需要真正的图像处理（sharp 或等价物），那是一个
原生依赖，会影响 Docker 镜像体积与构建链路——这个取舍该由你来定，不该顺手带进来。

## 重定向与 404

访客访问一个地址时的顺序是**页面 → 重定向 → 404**：

1. `getPublishedPublicPage` 找到已发布页 → 正常渲染
2. 没找到 → 查 `MarketingRedirect`（精确匹配 `from_path`），命中就 301/302
3. 还没有 → 自定义 404（slug 为 `404` 的已发布页），没建就用内置兜底页

**顺序不能反。** 让重定向抢在真实页面前面的话，租户后来又建了同名页就永远打不开
——而那种错很难联想到是几个月前加的一条重定向造成的。

**只精确匹配，不支持通配 / 正则**：写错一条通配规则的后果是整站进重定向循环，而这类
规则恰恰最难在编辑器里一眼看出对不对。需要批量时，几条明确的记录比一条聪明的规则可靠。

**只跳一跳**：目标又是另一条规则的源时不继续解析。多跳解析要防环、要限深，收益只是省
访客一次请求——真串起来了浏览器自己会走完，且它本来就有环保护。

**目标只放行站内路径与 `http(s)://`**。`//evil.example` 与 `/\evil.example` 单看都以 `/`
开头，但浏览器把它们当协议相对的**外站**地址——只判首字符就是一个开放重定向，两种写法
都单独挡掉了（`shared/site-redirect.ts`）。

**自定义 404 就是一张普通页面**（约定 slug `404`），用同一个编辑器排版、同一套发布流程
上线。不另开表 / 另加 `kind`：约定一个 slug 比多一种「特殊页面」类型便宜得多。
状态码仍然是 **404**，且强制 `noindex`——渲染出内容不代表这个地址存在，返 200 会让搜索
引擎把每个死链都当成一张真页面收录（soft 404）。

用例见 `shared/site-redirect.test.ts`、`server/site-redirect.service.test.ts`。

## SEO meta

| 能力 | 存哪 | 口径 |
| --- | --- | --- |
| 分享缩略图 | `theme_settings.og_image`（站点级）+ `page.settings.og_image`（逐页覆盖） | 相对路径按 origin 补成**绝对地址**——抓取器不带页面上下文；没图就整组图片标签不出（空 `content` 会被部分平台画成裂图），`twitter:card` 也相应退成 `summary` |
| 逐页 noindex | `page.settings.noindex` | 只掐收录，链接权重照常传递；同时从 sitemap 摘掉——留在 sitemap 又标 noindex 是自相矛盾的信号 |
| 会员页 noindex | 自动（`requires_member`） | `noindex, nofollow`：SSR 只有占位，收录了也是空页，所以连 follow 一起掐 |

og / twitter 的标题描述与 `<title>` / `description` **同源**，不另算一份。
`og_image` 只放行站内相对路径与 http(s)：同一个值也会进编辑器预览的 `<img src>`。

用例见 `server/ssr-seo.test.ts`。

## 表单段（`form`）

第一个**会往回写数据**的段：其余段都只是把 settings 画出来，它还要收访客填的东西。

| 层 | 位置 |
| --- | --- |
| 字段模型 + 校验（唯一真相源） | `shared/sections/form/fields.ts` |
| 提交与查看 | `server/site-form.service.ts` |
| 公开提交口 | `POST /api/public/site/form` |
| 租户侧查看 | `GET /api/site/form-submissions`、`/app/site/form-submissions` |
| 存储 | `MarketingFormSubmission` |

**字段表以已发布正文为准，不信客户端。** 提交时服务端按 `path` + `section_id` 现取那一段，
用它的 `field` block 重新算一遍字段表再校验：客户端想多送字段、改下拉选项、把必填改成
选填，都过不来。客户端也调同一个 `validateFormValues`，所以两端口径不会漂。

**失败一律不透露细节**：段不存在、不是表单、站点没发布，对外都是 404；只有「字段填得
不对」逐字段返回，那是填表人自己要看的。限流按 `租户:IP`，**进程内**滑动窗口——挡的是
脚本猛灌，不是分布式刷量（那要 Redis 或网关层，等真出现再上）。

**提交内容存成自描述的 `[{ id, label, value }]`**，不是 `{ fieldId: value }`：字段是 block，
租户随时会改标题、删字段、调顺序，按 id 存的话三个月后回头看只剩一堆 uuid 对不上任何东西。

**SSR 只出静态结构**；提交由 site-enhance 拦截（`validateFormValues` + `POST /api/public/site/form`）。
Theme Editor 预览里的 React `FormSection` 共用同一份校验。

## 默认内容从哪来

| 内容 | 位置 | 说明 |
| --- | --- | --- |
| 起步模板 | `shared/site-starters.ts` + `page-presets.ts` | key=`default`（home/docs/pricing） |
| 站点元信息 | `client/locales` · `starter.default.*` | starter 站名 / 标语 / 页脚简介 |
| Bootstrap | `server/ensure-default-marketing-site.ts` | 默认租户幂等 apply + 发布 |

新增页面：在 CMS Theme Editor 创建/发布即可；SEO 由 SSR + sitemap 动态生成。

## Nginx 分流

见 `docker/nginx/default.conf.template`：仅 `PLATFORM_HOST` 走静态 SPA；产品主域与其它 Host 的 HTML 反代 Fastify SSR；`/app` `/login` `/platform` 等仍走 SPA。

本地 Vite：`localhost` 文档导航代理到 `:3700` SSR；`127.0.0.1` 为平台控制台（不代理）。

SSR HTML 为 SEO 真相源；site-enhance 补交互层（会员入口、明暗切换、表单、会员正文）。

## 本地种子数据

```bash
# 给指定租户铺 default starter 并发布（默认 slug=default）
pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenantSlug]

# 只发首页的最小 SSR 冒烟
pnpm --filter server exec tsx scripts/seed-tenant-site-smoke.ts
```

`seed-local-marketing-site.ts` 调用 `applySiteStarter("default")` 后整站发布，可反复执行。

## 如何单独测试

```bash
pnpm --filter modules exec vitest --run --project 'marketing/*'
curl -sS -H 'Host: {slug}.{TENANT_BASE_DOMAIN}' http://127.0.0.1:3700/ | head
```
