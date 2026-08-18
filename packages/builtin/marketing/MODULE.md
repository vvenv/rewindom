# module-marketing

## 用途

统一租户 CMS 官网（Fastify SSR）：

1. **产品主域**（`FRONTEND_URL` / `APP_DOMAIN` / 本地 `localhost`）：隐式绑定**默认租户**（须先建租户行；官网内容用 `seed-local-marketing-site` 铺，不在 server 启动时自动写）
2. **其它绑定域**（`custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}`）：对应租户的已发布站点
3. **平台控制台**在独立 Host（`PLATFORM_URL` / 本地 `127.0.0.1`），**不**走本模块 SSR

## 面划分

| 面           | 路由                                                                  | 目录                                         | 守卫                                           |
| ------------ | --------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| 公开（SSR）  | `/`、`/:slug`、嵌套路径（及 `/{locale}/…`）、`/sitemap.xml`、`/robots.txt` | `server/ssr.routes.ts` + `client/enhance/`   | Host 绑定（含主域→default）+ 站点已发布        |
| 租户中台     | `/app/site`、`/app/site/editor`（`?page=` 区块树；`?scope=theme` 外观，从卡片进入）；站点设置为官网卡片上的 Sheet | `client/tenant/` + `client/pages/site-*.tsx` | entitlement `tenant-marketing` + `site.read` |

挂载点：`server.registerRoutes`（SSR + 公开 API）+ `client.renderRoutes`（CMS / 编辑器）。
公开站**不**挂 React；交互由 `site-enhance`（无 React IIFE）渐进增强。

`/` 由本模块占据，因此**登录后的落地页不是 `/`**，而是 `HOME_PATH_CANDIDATES` 解析出的路径。
外部链接想进应用一律指向 `/app`。平台管理员入口在 `PLATFORM_URL`。

公开页 chrome 由 SSR HTML 产出；编辑器预览用 React `SiteChrome` / `TenantSiteView`。
工作台页用 `PageLayout`。

## 常见改动

增量需求先填 FEATURE.spec（`extend-module`）。**其它模块**贡献段 / 模板 / chrome → 不要改本模块内核，用 `site-section` + 下文「业务模块贡献」。

| 我想改… | 从这些文件开始 | 不要碰 |
| --- | --- | --- |
| 内置段 schema / SSR | `shared/sections/<type>/definition.ts` + `html.ts` | 业务模块目录 |
| 页头页脚 chrome | `shared/sections/_common/` | 为新排法加枚举 / 读时升级层 |
| 模板页注册表 | `shared/page-templates.ts` | 业务方的 `*-page-templates.ts`（贡献方自己写） |
| 编辑器 / 工作台 | `client/pages/site-*.tsx`、`client/enhance/` | 公开站挂 React |
| 外观字体 | `shared/theme-fonts.ts`；改目录跑 `assemble:site-fonts`；生产同步 `sync-site-fonts-to-s3.ts` | Google Fonts CDN、自定义上传、中文 webfont |
| 首页是哪一页 | `shared/site-home.ts`、站点设置 Sheet | 两个下拉（版式 vs 改写 `/`） |
| 业务模块贡献段 / 模板 / chrome / 首页版式 | 贡献方 `shared/` + `site-section` | 本模块「顺便登记」业务 type |

## 租户 CMS 数据

| 模型            | 说明                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `MarketingSite` | 每租户一行：站名（可 `__i18n`）、标语、`theme_settings`、站点级 `published`、`home_path`（访客访问 `/` 时渲染的逻辑路径，默认 `/`）；`nav_json` / `footer_json` 为**已发布** chrome，同名 `_draft_json` 为编辑器草稿（同进同退，共用一个 `site_draft_dirty`）。导航条目嵌在 `chrome_nav` 块的 `settings.items` 里 |
| `MarketingPage` | `kind`: `home` \| `page` \| **模板页 kind**（见下）；`status`: `draft` \| `published`；`title` / `description` / `sections` / `settings` 为**已发布**正文，同名 `_draft` 四列为编辑器草稿（`settings` 即页面级画布覆盖，与正文同进同退） |

### 模板页（`shared/page-templates.ts`）

「kind 唯一、slug 固定」的那一类页面：marketing 自带 `home` 与 `not_found`，业务模块再贡献
（如 site-docs 的 `/docs`、site-member 的 `/member/login`）。与普通页面只差三条：

- **地址不由租户填**——kind 决定 slug（`validatePageSlug` 按注册表锁死）
- **每种语言最多一张**——重复建页报 `site.template_page_exists`
- **可以有一段必备段**——`required_section` 声明后，编辑器不给删，服务端保存时校验
  「有且仅有一段」（`site.template_section_required`）；段自己用 `page_kinds` 声明
  只能落在哪张页面上

版式本身仍是普通的 section 流，租户在同一个编辑器里排、同一套发布流程上线。

**相关时快照落库**：没有 entitlement 的常驻页在建租户时写入；声明了 `entitlement`
的在开关打开时写入（打开 `/app/site` 也会补缺）。SSR 在记录尚未落库时仍用内置预设
兜底——那是缺口不是产品路径。新增模板页种类**不需要数据迁移**，也不要做「自定义版式」
空态：登记 `registerPageTemplateKind` + `registerPageTemplatePreset` 即可。

注册表定义在 marketing，业务模块自己填（同 `registerSectionDefinition` 的方向）：
`/member/login` 的版式属于 site-member，marketing 不认识「会员」这个概念。

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

页头与页脚是**同一套东西**：同一张块表（`sections/_common/chrome-blocks.ts`）、同一个
SSR 渲染器（`_common/chrome-html.ts`）、同一个 React 组件（`SiteChrome`）、同一份 CSS
（`_common/styles.css` 的 chrome 段）。差别只有三样：语义元素（`<header>` / `<footer>`）、
吸顶（只页头有意义）、`spacing_above`（只页脚有意义）。

### 位置由**块**说了算，不由块的 type 说了算

这是整套 chrome 的核心。每个块带三个定位设置：

| 设置     | 取值                          | 说明                                   |
| -------- | ----------------------------- | -------------------------------------- |
| `row`    | 1 / 2 / 3                     | 第几行；空行不渲染                     |
| `align`  | start / center / end          | 行内靠左 / 居中 / 靠右                 |
| `mobile` | pin / menu / hide             | 窄屏：留在外面 / 收进汉堡 / 不显示     |

行是 `grid-template-columns: 1fr auto 1fr` 的三格（`chromeRows()` 把块摊成行 × 对齐区）。
「导航居中」= 导航块 `align: center`；「页脚底栏」= 版权块 `row: 2`；「页头分两行」= 把块
分到两行。

**以前是反过来的**：`partitionHeaderBlocks` 把品牌钉在左、导航钉在中、按钮钉在右，页脚则
把链接列钉在上排、语言钉在底栏。租户能调的只有同一堆里的先后顺序，想把按钮排到导航
左边就得改代码；于是每来一种排法就多一个枚举值去兜（`layout: split | centered`）——而
那条路本来就走不下去，「品牌居中 + 导航靠右」该叫什么？定位交给块自己之后，`layout`
下拉、`partitionHeaderBlocks`、`isFooterToolBlockType` 全部删掉。

| type              | settings                                    |
| ----------------- | ------------------------------------------- |
| `chrome_brand`    | show_logo, show_site_name, blurb            |
| `chrome_nav`      | title, items, display(inline\|column)       |
| `chrome_text`     | text（支持 `{year}` / `{site}` 占位符）      |
| `chrome_button`   | label, href, variant                        |
| `chrome_locale`   | —                                           |
| `chrome_theme`    | —                                           |
| `chrome_account`  | —                                           |

业务模块还可以**贡献** chrome 块（如 shop 的 `shop.cart-link`），加进页头就是一枚按钮，
与上表同一排定位。见下方「业务模块贡献 chrome 块」。

**`chrome_nav` 一个块管横排与竖列。** 以前是 `chrome_nav`（页头）与 `menu_column`（页脚）
两个 type，存的东西一模一样（都是 `settings.items`），差别只在画成一排还是一列——那是
显示方式，不是两种东西。分成两个 type 的直接后果是页头摆不出竖列、页脚摆不出横排，
底栏那排法务链接因此只能作为字段（`links`）塞进版权块里。现在它就是一个
`display: inline` 的导航块放在第二行。

**`chrome_text` 的占位符替掉了 `chrome_copyright` 的隐藏行为。** 那个块的语义是「留空则
自动生成 © 当年 站名」：输入框里空着、前台却有字，想改成「© 2020–{year} Acme, Inc.」
无从下手。现在默认值就是 `© {year} {site}`，看得见改得动，跨年与改站名照样自己跟上
（`_common/chrome-text.ts`）。

区域自身的 settings 只剩外壳（`_common/chrome-shell.ts`）：`padding_top` / `padding_bottom` /
`row_gap` / `show_divider`，页头另加 `sticky`、页脚另加 `spacing_above`，再加通用配色。
留白走 CSS 变量而不是直接算 `padding`：chrome 有多行，上下留白落在第一行与最后一行上，
而只有一行时两者落在同一行——往哪儿放由 CSS 的 `:first-child` / `:last-child` 决定。

### 窄屏：一份 DOM

`mobile: "menu"` 的块外面套一层 `.chrome-drawer`。**桌面上这层是 `display: contents`**，
块因此直接落在自己的对齐区里，排版与没有抽屉时逐像素一致；窄屏才把它变成真容器收起来，
由行末那枚 `.chrome-menu-toggle`（画成汉堡的 checkbox）驱动，展开靠 `:has()` 从行选到
抽屉——抽屉分散在各个对齐区里，和 checkbox 不是兄弟，`~` 够不着。

汉堡用 checkbox 而不是 `<button>` + JS，也不是 label 包隐藏 input：前者纯 CSS 就能展开、
无 JS 可用，且自带开关状态与键盘操作（空格）；后者键盘根本聚焦不到。

以前是把整份导航**复制一遍**塞进 `.header-mobile-nav`，靠 `display: none` 二选一——同一批
链接在 DOM 里出现两次，读屏器念两遍、`aria-current` 也重复。

### 没有读时升级层

`chrome-upgrade.ts` 整个删掉了。它做的是「把旧版 settings 里的导航与开关翻译成 block」，
代价是**每次读都要判一次这段是不是旧的**，而判据只能靠「有没有留着已删除的旧键」这种
间接信号——判错就把租户删掉的块塞回去，刷新一次长回来一次。schema 认不出的块由
`parseBlocks` 丢弃，区域本体由 `ensureAreaBody` 补，就这两条。

> ⚠️ 这次改版**不兼容**旧 chrome 数据：块 type 换了名字（`menu_column` / `chrome_copyright`
> / `chrome_doc_search` 已不存在），旧站点的页头页脚读出来会只剩一个空本体。开发库重跑
> `pnpm seed` 即可；已有租户数据需要各自重配一次页头页脚。

页头 / 页脚区渲染时**不许再包一层 `<header>` / `<footer>`**：`SiteHeader` 自己就是
`<header>`，外面套一层等高的祖先，`sticky` 就没有可粘的余量（sticky 只在包含块内部
移动），「吸顶」开关等于失效——编辑器预览若再包一层等高祖先就会犯这个错。
顺带也避免了嵌套 landmark。

### 站点导航（`shared/site-nav.ts`）

导航条目**直接嵌在** `chrome_nav` 块的 `settings.items` 里（页头页脚同一个块类型），
没有独立的菜单实体 / key / 共享库。以前做过一份 `menus_json` 让页头页脚按 key 引用——
「共用」是真需求，但做成带齿轮切换的菜单库是过渡设计；现在页脚要和页头一样时**复制**
一份（编辑器「从页头复制」，源由 `collectHeaderNavItems(header)` across 所有 `chrome_nav`
块收集——**别**去读页头 section 的 settings，那儿早就没有 items 了）。

条目形状：`{ id, source, label, href, category, expand, children[] }`。
建站默认页头只有「全部一级页面」（flat）：新站通常只有首页。`pages` 展开的是公开
页面目录里父路径为 `/` 的已发布页——含文档索引 `/docs`、商店 `/shop` 这类**可打开
的一级模板页**；首页由品牌链处理，详情模板（`/docs/:slug`）和购物车等二级功能页
不进目录（`isPublicCatalogPageKind`）。

| `source` | 展开成 |
| -------- | ------ |
| `link`   | 一条链接；可带**一层** `children` 做子菜单 |
| `pages`  | 全部已发布一级页面（含 `/docs`、`/shop` 索引） |

其它动态源由模块 `registerNavSource` 填进来：site-docs 登记 `site-docs` /
`site-docs.category`，shop 登记 `shop`（商店目录，下挂分类树）/ `shop.collection`
（某个分类）。存量数据里的 `docs` / `doc_category` 在解析时改写成 site-docs 那两项，
不是双读 API。

动态项的 `expand`：`children` 收成可展开的父项，`flat` 就地铺平。展不出内容时**整条
不渲染**（例外由源自己定：商店目录没有分类时仍留下 `/shop` 那条链接）。编辑器
（`SiteNavItemsField`，`type: "nav_items"`）按已登记源列出添加菜单。

`usesCategory` 的源（某个文档分类 / 某个商品分类）在编辑器里是**下拉**，选项由源自己
的 `categoryOptions(contributed)` 从自己那一格数据里取——marketing 不认识文档分类或
商品分类长什么样。没有选项时该源在「添加」菜单里置灰。条目标签留空时的占位文案取源的
`defaultLabel`（i18n key，可带命名空间）。

渲染两端同构：SSR 在 `sections/header|footer/html.ts`，SPA 在 `SiteChrome.tsx`，
都用原生 `<details>` 画下拉。贡献源展开所需的数据走 `SiteNavContext.contributed`
（与段渲染同一份）。

### 页头右侧的入口块

语言 / 明暗 / 会员三枚入口曾是页头 settings 上的三个 `show_*` 开关，现在各是一个
**block**：加进页头就是露，删掉就是不露，与按钮、搜索框在同一排里一起排序。能力本身
另有出处，块只管露不露，删掉不等于关掉能力：

| block            | 默认预置 | 能力由谁保证                                     |
| ---------------- | -------- | ------------------------------------------------ |
| `chrome_locale`  | **是**   | 本页 `alternates`——没译文时露不出来              |
| `chrome_theme`   | **是**   | 明暗内置且**永远跟随设备**；删掉只是不给手动按钮 |
| `chrome_account` | 否       | 租户是否开通会员（site-member）                  |

商店的购物车入口不是内置块：shop 贡献 `shop.cart-link`，开通商店后才出现在「添加区块」
菜单里，同样不预置。

前两个**预置**，第三个不预置，分界不是「哪个更常用」而是**不预置会不会悄悄废掉一个功能**：
语言切换器不在页头，租户翻完一版页面发布，前台什么都不会变——访客没有入口过去，也没有
任何地方提示他还差一个块；明暗那套存储与 SSR 注入脚本一直在跑，没有这个块访客就够不着。
两者都是「不适用时渲染不出任何东西」的块，预置的代价是零。会员入口则相反：能力由租户
开没开通会员决定，预置一个开不出来的入口只会在编辑器树里多一行永远没反应的东西。

改成块的理由与「显示项」时代是同一个：这一排东西回答的是同一个问题（这枚入口露不露），
就该在同一处配完。开关做不到的是**排序**——三个布尔值渲染顺序写死在代码里，租户想把
登录按钮挪到语言切换右边就只能改代码。

语言切换器更早还是站点级设置（`theme_settings.show_locale_switcher`），后来搬进页头
块；现格式直接存块，不再做读时回填。

### 明暗模式

站点默认跟随访客设备，访客也可以手动改。公开站样式是**语义 class**（**不用 Tailwind**），
按 Shopify section stylesheet 模型共置为真 `.css`：`shared/site-css/base.css`（primitive /
`.sec*` / `.grp*`）、`shared/site-css/member.css`（会员入口 chrome）、
`shared/sections/_common/styles.css`（跨段 `.card` / `.grid` 等）、以及
`shared/sections/<type>/styles.css`（该段与其 block 专用）。段目录**靠扫描发现**，没有
需要同步的清单；`assemble.mjs` 压缩后写进 `marketing-site-css.generated.ts`——常驻部分是
`MARKETING_SITE_CSS_BASE`，各段样式按 type 落在 `MARKETING_SECTION_CSS`（Vite 客户端 /
esbuild SSR / Vitest 共用，勿在运行时 `fs` 读旁路 css）。改样式只改 `.css`，再跑
`pnpm --filter @rewindom/builtin assemble:marketing-css`。

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

SSR 在页头有 `chrome_theme` 块时输出 `<button class="theme-toggle">`；点击与图标同步由
`site-enhance` 完成（语言切换器仍是纯 `<details>`，不依赖 enhance）。

### 会员入口（`chrome_account` 块）

未登录显示「登录」，登录后换成头像 + 账户下拉（账户页 / 退出登录）。

服务端注入点 `server/site-account-entry.ts`（`registerSiteAccountEntry`），site-member 在
`onBoot` 里填。它回答两件事：本站有没有账户能力（`available`），以及入口 HTML（登录链或
已登录菜单）。宿主口径：

| 宿主           | 数据来源                        | 渲染                                                              |
| -------------- | ------------------------------- | ----------------------------------------------------------------- |
| SSR 首屏       | cookie 会话 + 服务端注入点      | 未开通不输出；访客「登录」；已登录直接输出账户菜单并解锁门控正文 |
| 公开站交互     | site-enhance                    | 绑登出；**仅当页头有访客登录钮**时才探测 `/api/member/me` 升级菜单（没有 `chrome_account` 不打会员接口） |
| 主题编辑器预览 | `GET /api/site/capabilities`    | 开通了才灌 `SiteAccountEntryPreview`（slot）                      |

会员 JWT 在 HttpOnly cookie（`rewindom_member_*`）里，随 HTML / XHR 同源发送；SSR 可
直接解锁。次按钮（secondary）**不**默认成登录：登录归账户入口管。

### 公开站 site-enhance（交互层）

nginx 把绑定域的**所有** HTML 文档反代给 Fastify SSR。公开站**不**注入 React SPA
（不再 `createRoot(#root)`）。交互由：

1. SSR 输出挂点（theme 按钮、`.member-entry`、`form.site-form`、`main[data-member-gate]`）
2. `<script defer src="/api/public/site-enhance.js?v=…">`——源码在
   `client/enhance/`，`pnpm --filter @rewindom/builtin assemble:site-enhance` 打成 IIFE
   写入 `shared/site-enhance.generated.ts`

**贡献方的交互脚本也进这一个 IIFE**：模块在自己的 `client/enhance/index.ts` 里导出
`enhanceSite(ctx)`，assemble **扫目录发现**后拼一个构建期虚拟入口
（`bootSiteEnhance([...])`）。公开站因此仍只发一个脚本、一份长缓存，而定义留在贡献方
——marketing 的源码里没有任何指向业务模块的 import。`ctx` 是当前页面的语言与路径快照
（`client/enhance/page-context.ts`），贡献方不必自己去认 marketing 的 DOM 约定。

| 能力         | 行为                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| 明暗         | 读写 `localStorage.site-color-mode`，同步 `data-site-color-mode`                |
| 表单         | 由 `site-form` 贡献：拦截 `.site-form` → `POST /api/public/site-form/submit`     |
| 账户菜单     | SSR 已登录则绑登出；否则 `credentials` 调 `/api/member/me`（可 refresh）升级    |
| 会员专属正文 | SSR 未解锁时 `credentials` 调 `GET /api/site/content/page-html` 写入门控 main |

`/app` `/login` `/register` `/member` `/platform` 仍走 SPA（`SITE_APP_PREFIXES` /
nginx / vite 代理三处对齐，由 `nginx-spa-prefixes.test.ts` 守住）。
若 SPA 内客户端导航误入公开 CMS 路径，`AppNotFoundRedirect` 会 `location.replace`
硬跳回 SSR 文档。

**页面级**（`placements` 含 `page`）。`band` / `prose` 三处都能放——通栏 CTA 摆进页头区
就是公告条，prose 摆进页脚就是备案号，不另造类型。`group`（分栏）另外放行页脚区：
多栏页脚是布局问题，用同一个布局原语解，不在页脚 schema 里再长一套列宽字段。

内置段只保留**通用积木**（首屏、富文本、分栏、CTA、页面菜单）。表单、文档库、店面等业务段由模块贡献。
### 贡献段要按请求查库：`registerSectionContextProvider`

`SectionRenderContext.contributed` 一直都有，但只有**模块自有的 SSR 路由**填得上
（会员登录页、会员账单页都是自己那条 handler）。一个能摆在**任意页面**上、又需要
查库的段（billing 的定价区要读平台套餐配置）就没地方拿数据——段渲染器是同步的。

`server/section-context-providers.ts` 补上这个注入点：模块声明自己服务哪几个
section type，通用 SSR 路由在渲染前按**页面实际用到的段**调用并合并进 `contributed`。
没摆那些段就一次查询都不发；单个 provider 抛错也只让它那一段不渲染，不炸整页。

主题编辑器那一半是 `client/editor-context-providers.ts`（`registerEditorContextProvider`），
同一套 `sectionTypes` / 按需 / 抛错兜底口径。**两端要么都登记要么都不登记**：只有 SSR
那边预览就是空白，只有预览那边线上直接不渲染。

**两端的 `provide(input)` 都必须按 `input.locale` 取数**——那是当前这张页面的 locale
（SSR 来自 `pageLocale`，预览来自 `page.locale`），不是工作台界面语言。预览要打后台
接口拿数据时，把它显式带成 `?locale=`：api client 的 `Accept-Language` 写的是界面语言，
不带就会出现「编辑 en 页面、预览里却是中文标题」。服务端对应路由用「显式 `locale`
优先于 `resolveRequestLocale`」取值，金标准 `modules/shop/server/lib/request-locale.ts`。

曾经的 `feature-grid` / `steps` / `spec-list` / `cards` / `pricing` / `faq` 等营销专用版式
已移除——卖点网格、步骤、定价表、FAQ 等用 `prose`（Markdown）或 `group` 分栏组合即可；
存量页面里若仍引用已删 type，读路径会落成 `unsupported` 占位（见下）。

| type           | settings                                                               | blocks                                                                                  |
| -------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `hero`         | eyebrow, headline\*, subhead, align, show_glow, primary/secondary 按钮 | `stat`{term\*, detail}，最多 4                                                          |
| `page-header`  | show_header, headline, subhead（留空回落到页面 meta）；版式页签：align、通用 `layoutSettings`（默认上 48 / 下 24 px） | —                                                                                       |
| `page-menu`    | 抬头, source(children\|siblings), style(list\|cards), columns          | —（动态菜单：父页 children / 子页 siblings；条目来自已发布 `site.pages`）               |
| `form`         | 抬头, submit_label\*, success_message                                  | `field`{label\*, type, placeholder, required, options, validation…}，最多 16            |
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

`columns_layout` 存 12 栏**份额**（如 `"3:9"`，加起来正好 12）。`resolveGroupSpans`
只认份额；解析不出或与列数对不上时按列数等分。
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
空外背景 = 无自定义色块底；band 新建默认写内部 `background: muted` token（`.sec-bg-muted`），
边框走 `border_*`。
块级 / 页头页脚只有一层 `bg_color`（无内外之分）。
页签为内容 / 版式 / 外观三栏；窄侧栏未激活页签只显示图标。
所有留白存的都是**桌面 px**，窄屏两处渲染统一 ×0.7；`anchor` 归一化成 slug 后作为
`<section id>`，供页内导航链 `#anchor`。

页头 / 页脚 / 页面正文、以及各段的 block（如 `field`）同样挂 `styleSettings()`。
站点主题另有整站画布 `bg_color` / `fg_color`；页面设置可覆盖正文区画布色。

### 多语言

URL 对齐 Shopify Markets：站点**主语言不带前缀**（`MarketingSite.default_locale`，SEO 主入口），
其余语言走 `/{locale}/…` 子目录。路由规则集中在 `shared/site-locale.ts`（排除应用区前缀，
不靠页面白名单）。locale 的 slug 占住了 `RESERVED_PAGE_SLUGS`，否则一个叫 `en`
的顶层页会把整棵 `/en/*` 遮住。

无前缀地址在 catch-all 里 locale 是 `null`。CMS 页用 `site.default_locale` 填；
贡献路径（`/events`、`/docs`、`/shop`）和会员 / 店面自己的 Fastify 路由必须走
`resolvePageLocale(requested, site.default_locale)`（或 `resolveVisitorPageLocale`），
**不要** `normalizeLocale(locale)`——那会掉到代码兜底 `zh-CN`，主语言改成 `en` 后
`/` 仍整页中文。站内重定向的 Location 仍用 URL 上的 locale（`null` = 不带前缀）。

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

页头的**语言切换器**是页头里的一个 `chrome_locale` 块（与站点导航 / 明暗 /
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
`select` 的候选一般写在 schema 的 `options` 里；分类名这种随租户变的名单用
`options_from`，由贡献方 `registerSettingSelectOptions` 填进来（金标准：shop
`shop.collection-list` 的根分类）。有 `options_from` 时写入不再按静态 options 丢值，
存的仍是字符串。
`richtext` 存 Markdown：控件仍是那块 textarea，标签行右侧多一颗「全屏编辑」
（`MarkdownFullscreenDialog.tsx` → `MarkdownFullscreenEditor.tsx`，`@uiw/react-md-editor`，
`lazy()` 加载，独立 `md-editor-vendor` chunk）。`textarea` / `list` 不给——它们不吃 Markdown。
`label` / `content` 存的是 i18n key（`marketing` namespace 下相对 key），shared 层不含展示文案。

`header` / `footer` 是站点级 chrome，不进段流：它们的渲染在
`shared/sections/{header,footer}/html.ts`（SSR）与 `SiteChrome.tsx`（SPA），
不套 `sec-band` 外壳，也不在上面两张渲染器表里。

#### 业务模块贡献 section

逐步剧本：`site-section` skill。段不必都住在 marketing 里。业务模块可以贡献自己的段，方向与 `site-account-entry` 一致：
**注册表定义在消费方**（marketing），模块自己把定义填进来；marketing 不知道任何业务模块的
存在，也不反向 import。首个真实用例是 site-member 的「会员专属内容」段。

一个贡献段要三样东西，**定义与 markup 各只写一份**（放贡献方的 `shared/`，两端 import 同一个对象）：

| 位置 | 做什么 |
| --- | --- |
| `<模块>/shared/xxx-section.ts` | `SectionDefinition`（type 必须带模块前缀） |
| `<模块>/shared/sections/*-html.ts` | **一份** HTML 渲染器 |
| `<模块>/shared/site-css/<name>.css` | 贡献段 CSS 真源；assemble 成 `site-css.generated.ts`，禁止手写 `*-css.ts` |
| `<模块>/server/…` → `registerSiteSectionHtml(def, render, { css })` | 在 `onBoot` 里注册 SSR |
| `<模块>/client/module.tsx` → `registerSiteSectionView(def, htmlSectionView(render), { css })` | 编辑器预览灌同一串 HTML |

**为什么是两次注册而不是一次**：客户端与服务端本来就是两个 bundle，React 组件进不了
Fastify。markup 不要因此写成两份——client 用 `htmlSectionView` 包同一个渲染器。金标准：shop
店面段。内置 marketing 段仍是 React + HTML 各一份。

**type 必须带模块前缀**（`site-member.gate`）：段 type 会落进租户页面的存储里，两个模块
撞名的后果是页面内容被另一个模块的 schema 解析——所以注册表对撞名**直接抛**，启动时炸掉
远好过在某个租户的页面上悄悄错乱。

**entitlement**：定义里声明 `entitlement`，租户没开通就不进「添加区块」菜单
（`/api/site/capabilities` 回传已开通列表），也不渲染（`SectionRenderContext.enabledEntitlements`，
由 `site-entitlements.ts` 按租户解析）。渲染器是**进程级**注册的、开通与否是**租户级**的，
所以闸门只能在渲染时按租户拦。忘了传集合按「都没开通」处理——少了而不是多了。

**CSS** 真源是贡献方的 `shared/site-css/<name>.css`，`pnpm --filter @rewindom/builtin assemble:module-css` 压成 `site-css.generated.ts`，再随注册交进来。内置段的样式构建期就打进 `MARKETING_SECTION_CSS` 了，贡献段进不了那次打包，所以运行时注册进来、一律拼在最后（覆盖内置类时不必打优先级战争）。贡献段同样 **按需**发：这一页没上它就不发（见 `loadMarketingSiteCssFor`）。

**禁止**手写 `shared/*-css.ts` 模板字符串（`shop-css.ts` 那类）：生产 server 是单文件 bundle，旁路 `.css` 读不了，手写字符串还逃过剥注释。Rule：`site-section-css`。金标准：`site-member/shared/site-css/`。

#### 业务模块贡献 chrome 块

页头 / 页脚里「和语言切换同一排的那枚按钮」是 **block**，不是再往区域里塞一段。
公告条才是区域里的段（`band`）；购物车入口、会员入口这种要紧凑地排在品牌 / 导航旁边，
走 chrome 块。

方向与贡献段相同：注册表在 marketing，模块自己把定义填进来。type 必须带模块前缀
（`shop.cart-link`），撞名直接抛。`entitlement` 闸门同样生效：未开通不进菜单、不渲染。

| 位置 | 做什么 |
| --- | --- |
| `<模块>/shared/xxx.ts` | `BlockDefinition`（含 `chromeSlotSettings()`，否则永远钉在第一行左边） |
| `<模块>/shared/sections/*-html.ts` | **一份** HTML 渲染器 |
| `<模块>/server/…` → `registerChromeBlockHtml(def, render, { css })` | SSR |
| `<模块>/client/module.tsx` → `registerChromeBlockView(def, htmlChromeBlockView(render), { css, icon })` | 编辑器预览 |

两端 import 同一份 definition。金标准：shop 的购物车入口。

**停用之后不丢内容**：模块被移除或租户退订时，页面上已经摆好的那一段走下面的
`unsupported` 口径原样兜住，重新启用就自动回来。这是这个契约敢用的前提。

用例见 `shared/section-contribution.test.ts`。

#### 业务模块贡献模板页

路径固定、每种语言最多一张的页面（登录页、商店首页、文档版式）走模板页注册表，
不要自己写初始化、不要做「自定义版式」空态。

| 位置 | 做什么 |
| --- | --- |
| `<模块>/shared/*-page-templates.ts` | `registerPageTemplateKind` + `registerPageTemplatePreset`（同一函数里成对登记） |
| server `onBoot` + client manifest | 各调一次注册函数（幂等） |

有租户开关的模板必须声明 `entitlement`。marketing 在「对该站点变得相关」时快照落库：

- 常驻（无 entitlement）→ `tenant.created`
- 有开关 → `tenant.entitlements.updated`（打开 `/app/site` 也会补缺）

金标准：`site-member/shared/member-page-templates.ts`、`shop/shared/shop-page-templates.ts`。
`pnpm check:modules` 会查 kind/preset 成对、有开关则声明了 entitlement、客户端没有「自定义版式」。

预设 `text` / `titleKey` / `descriptionKey` 必须是 `ns:key`，与对应 setting 的 `default`
同一条（登录标题用 `headingSettings({ headingDefault: "site-member:login.title" })`）。
复制跨语言时库存句换成目标语言，租户改过的才搬原文。不要先 `t()` 成单语字符串。

#### 业务模块贡献首页版式

首页只有一张（`kind: home`，路径 `/`）。模块可以再登记一套**首页版式**，让租户把站点
根换成自己的内容结构（例如事件雷达的升温 + 正在发生）。设置里和「把另一张页占据 /」
合成一个下拉：选版式就套到首页模板上，并把 `home_path` 收回 `/`。

与模板页正交：`/events`、`/shop` 仍是各自的模板页；首页版式套的是同一张首页上的段。
店面 / 文档库的入口就是自己的枢纽页，通常不必再贡献一份，除非要把该模块做成站点根。

| 位置 | 做什么 |
| --- | --- |
| `<模块>/shared/*-page-templates.ts` | `registerHomeLayout({ key, label, entitlement?, rootPrefix?, preset })`（`preset.kind` 必须是 `home`） |
| server `onBoot` + client manifest | 与模板页同一个注册函数里调（幂等） |

有租户开关必须声明 `entitlement`。要把本模块公开前缀收到站点根时声明 `rootPrefix`
（如 `/events`）：选择器不再把该枢纽列为「设为首页」，公开 URL 由贡献模块按
`home_layout_key` 判定。套用只写首页草稿，同时把 `home_path` 收回 `/`。
「重设为最新版式」与 SSR 兜底按 `MarketingSite.home_layout_key` 取当前那套。
金标准：events `events.home`。

#### 贡献公开路径、保留 slug、sitemap、链接候选

不是 `MarketingPage` 的公开地址（文档库 `/docs`）不要写进 `renderPath`。模块登记：

- `registerSitePathHandler` — locale 剥离后、查页面前接管路径。`canonicalRedirect` 可把旧前缀 301 到规范地址（事件枢纽当首页时 `/events/*` → `/`、`/:slug`）
- `registerSitePathFallback` — **CMS 未命中后**再问；`render` 返回 `null` 继续重定向 / 404，不直接 404。给「公开 URL 收到站点根」的模块用，避免 `/:slug` 抢走已发布的 CMS 页
- `registerReservedPageSlug` — 自定义页不能占用该一级 slug
- sitemap / link-target providers — `sitemap.xml` 与编辑器链接下拉的额外条目

存量段 type `doc-list` 等、chrome `chrome_search`、导航源 `docs` / `doc_category`
在解析时改写成 site-docs 的贡献名，不是双读 API。金标准：`site-docs`。

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
模块开关能让 `hero` 变成合法的页头段——兜着它也永远复活不了。

**拒收**是因为编辑器手上的未知段一定已经是占位（读路径给的），写路径上再冒出一个裸的
未知 type，只可能是客户端 bug 或构造的请求。

占位两端都不渲染（不在任何渲染器表里），公开页与 SSR 一致——不可用不等于露出半个坏掉的
段。编辑器里它照常出现在段树上（警示图标），能选中、能删，设置面板给一句说明而不是空白。
`placements: []` 保证它永远不出现在「添加区块」菜单里。

一段坏了也不再连坐：页头 / 页脚以前是「一段解析失败 → 整个区域重置成默认」，现在逐段跳过。

用例见 `shared/unsupported-section.test.ts`。

未知 block type 直接丢弃；`safeSections` 只跳过损坏的单个 section，不再整页清空。

路径约定：`home` → `/`；`page` → `/{slug}`（slug 可多段，如 `guide/quickstart`）。
`pricing` 不在保留 slug 里——绑定域名上归租户（平台页只在平台域名下有意义）。
内核保留 slug 只有 locale、应用区、`SITE_APP_PREFIXES`；`docs` 由 site-docs
`registerReservedPageSlug` 登记，没装该模块时租户可以建一张叫 `docs` 的普通页。

**动态页面菜单**：在编辑器里插入 `page-menu` section——父页选 `children`，子页选
`siblings`；条目随已发布页面目录自动更新，无需手填链接。要做成左侧栏就把它放进
`group` 的第一列（`3:9` + 列 sticky），没有 chrome 级的自动侧栏。

**链接候选**：`GET /api/site/link-targets` 先列 `MarketingPage`，再合并
`resolveContributedLinkTargets`（文档等分组由贡献方填；`SITE_LINK_TARGET_GROUPS`
仍保留 `"doc"` 给贡献方用）。存的仍是普通 href。

### 站点管理页（`/app/site`）

一张卡：卡头是站点（站名 / 发布状态 / 计数 / 站点设置 / 查看官网），卡身是页面列表，
底下常驻模板页（首页 / 文档版式 / 会员版式等）。页面与它所在的站点是同一个对象，不拆成两张卡。

- **一行 = 一个页面**，同 `(kind, slug)` 的各语言合成一个**翻译组**（`site-page-groups.ts`）。
  单语言时组头与那一行合并；多语言时组头 + 缩进的语言行。整行是热区：标题 / 语言名
  这个链接用 `after:inset-0` 摊满整行，全行只有一个真链接，⌘ 点、中键、Tab 都照常
- **行内操作**与文档库同一套：发布 / 取消发布留在行上（最高频），打开编辑器 / 复制 /
  删除收进「更多」菜单
- **排序**（`sort_order`）决定页头「全部一级页面」、`page-menu` 与 sitemap 的先后，
  上下移是两枚常驻按钮——排一次顺序要连点好几下，每下都展开一次菜单没人受得了。
  写回走整批端点 `PUT /api/site/pages/order`（一个事务，见 `reorderPages`），
  客户端算出的是**重编号**而不是「与邻居换值」：存量页面 `sort_order` 全是 0，
  换值等于没换。同一翻译组各语言共用一个值（导航里它们是同一个位置）
- **筛选**（搜索 / 状态 / 语言，走 URL，`use-site-pages-page.ts`）在页面组数达到阈值后
  才出现。筛选中**不给排序入口**：可见的先后与真实先后不是一回事，点下去等于盲排。
  筛选裁的是组内的语言行，剩一行也保留该组
- **新建页面**可选一套页面预设（与编辑器工具栏同一份 `PAGE_PRESETS`），文案按**目标
  语言**落地；建完直接进编辑器——一张空白页留在列表里什么也说明不了
- 列表里的路径只作展示不做链接（同文档库）：站点跑在租户自己的域名上，管理端拼不出
  可点的绝对地址
- **进编辑器**：点页面行改该页与页头页脚。外观（Logo / 配色 / 版式）在卡片上与「站点设置」并列，打开 `/app/site/editor?scope=theme`。卡片上不再挂「编辑某某 / 页头页脚」那种对不齐落点的按钮。
- **模板页不可删**：`isTemplatePageKind`（首页、文档版式、会员版式等）只许重设预设，
  服务端 `deletePage` 也拦；普通 `page` 仍可删。

### 站点编辑器（`/app/site/editor`）

**两个入口，同一套壳**：页面行打开区块树（页面 + 页头页脚）；卡片「外观」打开主题层
（`?scope=theme`，不带页面）。共用一块预览、一条站点级草稿/发布链。

| 参数              | 作用                                                            |
| ----------------- | --------------------------------------------------------------- |
| `?page=<id>`      | 树里多出「页面区块」那一段；不带就只有页头页脚，改导航不必先挑页面 |
| `?scope=theme`    | 外观：无区块树，预览默认首页，右侧是主题字段（Logo / 配色 / 版式） |

主题不是树上的对象（没有可选中的段），所以不放进页面编辑器左栏——埋在那里等于找不到
Logo。外观需要实站预览，也不能塞进站点设置 Sheet（那份是失焦即存）。

没打开页面时右上角那枚发布是 `EditorToolbar`（站点级链），打开了则是 `PageEditorToolbar`
（正文 + 站点级同事务）。页面被删 / 链接过期不整页失败：页头页脚照样能编。

三栏：

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

block 不跨层：它的 schema 属于所在 section，一个 `field` 换不到 `band` 段上去，
`reorderBlock` 用 `reorderItem` 认死同一个列表。

排序两条路：拖放 + 上下移按钮。上下移只在自己那一层内动，**跨层只能靠拖放**——
曾经为此加过一个行内「移动到」下拉，但拖放通了之后它就是重复入口，为它在每行挂个菜单不划算，已删。

左树的选中项因此是个判别联合（`ThemeEditorSelection`）：`meta` 或某一段 / 某个 block。

设置面板的「内容 / 版式」页签按**该 section 真有没有字段**渲染：只有一组有字段就直接铺开不套页签
（如分栏段设置全在版式下），两组都没有则只显示一句提示。只剩分组抬头的一组算空组。

**不带页面进编辑器**（`/app/site/editor`）：左树只有页头 / 页脚两组；保存
`PUT /api/site/draft`，发布 `POST /api/site/draft/publish`，撤销 `POST /api/site/draft/revert`
——这三个接口连主题一起处理。与页面草稿列无关，但共用同一套 section schema 与预览组件。
外观入口（`?scope=theme`）走同一条站点级链，只是不渲染区块树、预览默认首页。

打开页面时保存一次写页面 sections 与站点级草稿（页头页脚 + 主题）：`PUT /api/site/pages/:id/draft`（`saveEditorDraft`，同事务）。
站点级那几样也可单独发布：`POST /api/site/draft/publish`（草稿列复制到 `nav_json` / `footer_json` / `theme_settings`）；
在编辑器里打开某一页点发布，则与本页正文同一事务上线。
已发布页面正文上线：`POST /api/site/pages/:id/content/publish`（将草稿列复制到 `title` / `description` / `sections` / `settings`）。
首次发布页面：`POST /api/site/pages/:id/publish`（`status` → `published` 并同步正文草稿）。

**撤销未发布的草稿**是发布的反向，两级各有入口（都在工具栏「更多」里，按需出现）：

| 撤到哪儿             | 入口                                            | 条件                     |
| -------------------- | ----------------------------------------------- | ------------------------ |
| 内存 → 已保存的草稿  | 纯前端（清 sessionStorage 缓存后重新灌入）      | `dirty`                  |
| 页面草稿 → 线上      | `POST /api/site/pages/:id/content/revert`       | 页面 `published` 且脏     |
| 站点级草稿 → 线上    | `POST /api/site/draft/revert`                   | `site_draft_dirty`       |

服务端两条 revert 是 publish 的镜像：把无后缀列回灌进 `_draft` 列。页面级那条只对
**已发布**页面开放——没上线过的页面，无后缀列里躺的是建页初值，拿它当还原目标只会
给出一个用户从没见过的版本。可撤性由 `resolveEditorPublishState` 与发布态一起算出
（`canDiscardLocal` / `canRevertContent`），工具栏只负责渲染。
图片上传：`POST /api/site/assets` → 公开 URL `/api/public/tenants/:slug/site-assets/:filename`。
草稿预览 API：`GET /api/site/preview?path=`（需 `site.read`，含 draft 页面 + 草稿 chrome）。

顶部工具栏是**页面级**操作区：页面切换器（`PageSwitcher`，只列同语言的页面，改完一页直接切下一页）、
语言按钮组、复制、预设、发布、保存。整页替换 sections 的「预设」放这里而不是区块树里——
它与「添加区块」不是一档操作，挨着摆成同样的下拉太容易误点。

**工具栏只有一份**（`components/theme-editor/EditorToolbar.tsx`）：容器、返回、状态、
保存 / 发布此一份，差异收成三个插槽——`nav`（换页 / 换语言 / 版本历史）、
`menuItemsBefore` / `menuItemsAfter`（复制、取消发布）、`publishLabelKey`。打开页面时那
几样特有的东西装在 `PageEditorToolbar` 里（复制那张 Sheet 必须挂在工具栏**外面**：
菜单项当不了 `SheetTrigger`，而菜单内容关闭时会卸载）。

原先两份工具栏逐字重复，状态却长歪了：一个画彩色胶囊、一个画小圆点，撤销项一个带说明
一个不带，页头页脚那份还把不可点的按钮直接藏掉。收敛后统一成「小圆点 + 文案」、
按钮留在原位置置灰（`publishBlockedKey` 在 tooltip 里说明为什么发不了）。
状态机同理只剩 `resolveEditorPublishState` 一个——没打开页面时除了 `stale` 一句文案
完全一样，靠 `scope: "chrome"` 区分；那时没有「本页正文」这一维，`published` /
`contentDirty` 走默认值。

编辑器状态全在本地草稿里，**离开就丢**（返回列表 / 换页 / 换语言都是重新加载），
所以这三处导航统一走 `leaveTo()`：`useSiteEditor` 用灌入时的快照算 `dirty`，脏了先弹确认。
草稿也进 sessionStorage（`?page=` 一份、没有页面时共用 `site` 那一份）。

**复制页面**（`POST /api/site/pages/:id/duplicate`，只要标题 + 目标语言）：区块结构照搬，
复制件一律是**草稿**。库存文案（locale JSON 里那句，租户没改过）写成目标语言的
catalog 译文；改过的句子把源语言原文填进目标槽位当翻译起点（`relocalizeSections`）。
编辑器读的是「当前语言的槽位」且刻意不回落，库存句若也搬原文，英文登录页就会留下
「登录后即可访问会员内容」。slug 不让填：`(kind, slug)` 是翻译组的 key，
复制到别的语言必须沿用源 slug 才能自动成组；目标语言已占用该 slug 时（即同语言复制）
才派生 `about-copy` / `about-copy-2`，首页因为 slug 固定为 `home` 直接返回 `site.home_exists`。

**页面预设 / 模板页**（`shared/page-presets.ts`，客户端 re-export）描述默认版式结构 +
`ns:key`：marketing 自带首页模板（`home`）；文档版式由 site-docs 登记。文案在创建时
展开成整张 `__i18n` 表，公开面再按 URL 语言压扁；套完随便改。预设 `text` 与对应
setting 的 `default` 应是同一条 key。

**站点初始化**（`server/site-init.service.ts` + `shared/site-starters.ts` 的 chrome 构建）在
租户创建时铺好默认页头 / 页脚 / 主题与主语言首页等模板页。产品面**不再**提供「一键应用
起步模板」；日常回到最新靠页面「重设为最新版式」与主题包「重设为最新」。

初始化刻意很轻：首页只有 hero / 富文本 / CTA 三段，文案是可替换的占位，
页头不预设按钮、页脚不预设链接组。文档版式、会员页等模板页也会快照成可编辑记录，
内容仍是内置预设。关于我们、联系、定价等普通页面由租户自己在 CMS 里新建，
或用 `prose` / `group` / `form` 自由拼版式。

模板里的链接也不能写死站内地址：起步只建首页，别处都指不到；`/register` 更是
**工作台的员工注册页**（`apps/client/src/shell/guest-routes.tsx`），租户站点的访客点进去
会看到 SaaS 运营方的注册表单。首页 CTA 因此走页内锚点（`#contact` → band 段的 `anchor`），
`SiteLink` 会把 `#` 开头的 href 原样交给 `<a>`，不再当相对路径去补 locale 前缀。

### 站点设置（官网卡片 → Sheet）

站点级的东西按**是不是要看着预览调**分两处：

| 在哪                                   | 内容                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| 编辑器主题设置层（页面行 → 主题设置） | 主题包、站点 Logo、分享图、配色、字体、页宽、区块间距       |
| 站点设置 Sheet（官网卡片 →「站点设置」） | 基本信息、语言、首页、重定向、发布（五个分区，控件即存）         |

外观进编辑器而不是留在设置页，是因为它要**看着预览调**。它曾经是设置页的一个页签，
又曾经是一张带只读预览的独立页——前者太深（官网 → 站点设置 → 外观），后者的预览是
第四份实现且点不动。

设置 Sheet 的分区上下排布（窄 Sheet 不用页签）：

| 分区     | 字段                           | 提交                                     |
| -------- | ------------------------------ | ---------------------------------------- |
| 基本信息 | 站名 / 标语（逐字段 `__i18n`） | `{ site_name, tagline }`，**失焦即存**   |
| 语言     | 主语言                         | `{ default_locale, site_name, tagline }`，**确认即存** |
| 首页     | 打开 `/` 时的版式或另一张页 | 版式走 `POST /site/home-layout`（收回 `home_path=/`）；其它页 `{ home_path }` 下拉即存 |
| 发布     | 站点总开关                     | `{ published }`，**开关即存**            |
| 重定向   | 旧地址 → 新地址                | 各自的 `/site/redirects` 接口            |

**控件即提交**：分区共用 `use-site-settings-form`，每个分区只提交自己那几个字段，审计里
「改了站名」与「换了主语言」是两条记录。不另配保存按钮——改完关 Sheet 就当已经生效。

「语言」是唯一带别的字段的：换主语言必须连带把文案钉在原语言下（`pinToLocale`），
拆成两次请求会留下一个「文案语言已失真」的中间态。

**首页**是一个下拉：首页模板的各套版式，加上其它可打开的页面（`/shop`、`/about`）。
选版式 → 首页草稿换成那套段，`home_path` 收回 `/`（发布后访客才看到新草稿）。
选另一张页 → `home_path` 下拉即存，SSR **不 30x 改写 `/`**——站点根 URL 不变，canonical
指向 `/`。参数化详情（`/events/:slug`）和 404 不行。贡献版式可声明 `rootPrefix`
（事件雷达 `/events`）：选择器不再把该枢纽列为「设为首页」，公开前缀是否收到 `/`
由模块按 `home_layout_key` 判定。存量 `home_path=/events` 仍能改写 `/`。
目标页开关关掉或被删时回落默认首页。页面列表里当前首页带「首页」
徽章；行菜单「设为首页」在枢纽被版式接管时改为套用该版式。

设置**不进侧栏**：那几组设完就不太回来，从官网卡片开 Sheet。

只读用户（`site.read` 无 `site.write`）也能开 Sheet：字段禁用、不触发提交。

**重定向**从侧栏挪进了设置 Sheet：侧栏「站点」分组每一项都是一类内容集合，而重定向是
「旧地址怎么处理」的一条路由规则，配完就不再回来。媒体库留在侧栏——图片是内容。

### 站点主题的归属

**站点主题**（Logo / Favicon / 分享图 / 配色 / 字体 / 页宽 / 区块间距）在官网卡片的
**「外观」**（`/app/site/editor?scope=theme`），与「站点设置」并列。中台那边**没有**品牌页了。

历史上分过两次家又合回来：先是借 `platform` 的 `settingsBrandingExtraSlot` 把主题字段
注入品牌页——那页按 `settings.*` 授权，而这些字段落库走 `PATCH /api/site`（`site.write`），
两套权限对不上，撤掉了；后来品牌页只留跨模块共用的 Logo / Favicon，官网继承它——
这层继承也删了，因为中台不再消费品牌资产（见 `docs/design/tenant-config.md` §2.4），
一份只服务官网的资产没有理由住在中台。

`logo_url` / `favicon_url` 都用 `SiteImageField`（媒体库选图或外链），与 `og_image` 同一套控件。

**主题有自己的草稿列**（`theme_settings_draft`，迁移 `20260811114014_marketing_theme_draft`
带回填），与页头页脚**同一条发布链**：改完存草稿、发布才对访客生效，撤销一起回滚。
`site_draft_dirty`（原 `chrome_dirty`）三样一起算——只改了配色也要标「未发布」，否则
状态点报绿而访客看到的还是旧配色。管理端 `toMarketingSite` 读草稿列，公开面读线上列。

以前主题是「一存就全站生效」，与同屏的页头页脚草稿两种语义，塞进一个编辑器后一个
「保存」按钮说不清自己干了什么。

**主题包**同样只改草稿，跟着工具栏的「保存草稿」落库——所以不再弹确认框（改了什么在
右侧字段与中间预览里当场可见，不保存就不算数）。覆盖语义与服务端一键套用共用
`shared/site-themes.ts` 的 `applySiteThemeSettings`。
`POST /site/themes/:key/apply`（写草稿 + 审计）保留给 Agent / API 调用方。

`theme_settings` 是站点主题的**唯一真相源**——`logo_url` / `primary_color` 曾经另有独立列，
已由 `20260804020000_marketing_site_theme_only` 回填后删除；API 上的同名顶层字段是派生值。

**字体**是精选目录（`shared/theme-fonts.ts`），不是任意 `font-family`。`system` / `serif` /
`mono` 是系统栈（零请求）；其余是自托管西文 variable 切片（latin + latin-ext，OFL），
中文回落系统字体。默认文件在 `apps/client/public/assets/site-fonts/`，走 nginx 已有的
`/assets/`（同源，无 CORS）。SSR 与预览只在选中 webfont 时注入对应 `@font-face`。
改目录或升级 `@fontsource-variable/*` 后跑
`pnpm --filter @rewindom/builtin assemble:site-fonts`。

生产若要把切片放到对象存储（备份、或以后给中文大文件用）：跑
`pnpm --filter server exec tsx scripts/sync-site-fonts-to-s3.ts`，键为
`platform/site-fonts/`。公开页默认仍走同源 `/assets/`——`@font-face` 跨源需要 bucket CORS，
有 `S3_PUBLIC_BASE_URL` 的租户媒体桶通常是给 `<img>` 用的，不能默认改写字体 URL。
要公开页走 CDN 时再显式接 `themeFontCdnDir`。不做 Google Fonts CDN、不做自定义上传。

**Favicon 必须显式输出**：SSR 的 `<head>` 无条件写 `<link rel="icon">`，站点没填就指向产品
默认 `/favicon.svg`。不写这一行时浏览器会去猜 `/favicon.ico`，官网这个路径上没有东西，
结果是标签页挂一个空白图标。

API：

- 租户：`/api/site`、`/api/site/capabilities`、`/api/site/draft`（站点级草稿：`PUT` 存 / `POST /publish` / `POST /revert`）、`/api/site/pages…`（含 `POST /pages/:id/duplicate`）、`/api/site/preview`（权限 `site.read` / `site.write`）
- 公开：`GET /api/public/site`、`GET /api/public/site/page?path=`
- Entitlement key：`tenant-marketing`

现有租户管理员补权限：`pnpm --filter server exec tsx scripts/sync-builtin-admin-permissions.ts`

## 主题包与站点初始化

**主题包 = 一组 `theme_settings` 预设值**（`shared/site-themes.ts`：default / docs / bold /
minimal），套用时直接写进站点的 `theme_settings`。

**刻意不做成运行时的一层**（包的值 + 租户覆盖）：那样每个读 token 的地方都要处理级联，
而租户改完一个颜色后「到底哪一份在生效」也说不清。写下去之后 `theme_settings` 始终是唯一
真相源，「我改了主色」的行为就和它看起来的一样。代价是套用新包会**覆盖**已有微调——所以
确认框里写清楚了，而不是悄悄换掉。

包里**只有外观 token**，不含 `logo_url` / `og_image`：那是品牌资产不是风格，换配色不该把
logo 抹掉（`applySiteTheme` 显式把它们保留下来）。

**初始化配方 = 主题包 + 页面组合**（`SITE_STARTERS` / `buildSiteStarterChrome`，当前仅
`default`）。租户创建时由 `initializeTenantSite` 落库；**没有**产品面「应用起步模板」API。
`buildSiteStarter` 仍可供测试与内部拼装，对不认识的 key 返回 `null`。

页头 / 页脚各模板暂时共用一套：区别在页面组合与主题，不在 chrome 结构。真需要不同页头的
那天再给配方加字段，不先造一层用不上的抽象。

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

管理入口在**站点设置 Sheet →「重定向」**（官网卡片），不在侧栏。

访客访问一个地址时：

1. **贡献路径**（`/docs`、`/events`…）若匹配：先查重定向（精确匹配**地址栏路径**），命中就 301/302；否则交给 handler 渲染
2. 否则 **已发布 CMS 页** → 正常渲染（CMS 页仍优先于重定向：后来建的同名页不该被几个月前的规则挡住）
3. 否则再查一次重定向；还没有 → `not_found` 模板页

`/events` 只要模块开着就永远能画出一页。重定向必须抢在 handler 渲染之前，否则「把
`/events` 跳到 `/`」这种规则永远不会跑。首页改写（`/` 渲染 `/events`）不走这条规则，
避免首页自己跳走。

SSR 入口是一条 `/*` catch-all（加精确的 `/`）：末尾斜杠、`/{locale}/…` 前缀、超过三段的旧
URL 都会先规范化再查。来源写成 `/en/old` 或 `/old/` 与 `/old` 是同一条规则。带语言前缀
进来的请求，站内目标也会带上同一个前缀，避免人掉回默认语言。

**CMS 页的顺序不能反。** 让重定向抢在真实 CMS 页前面的话，租户后来又建了同名页就永远
打不开——而那种错很难联想到是几个月前加的一条重定向造成的。贡献路径相反：模块开着
地址就被占住，不让规则抢先，设置里的重定向就是死的。

**只精确匹配，不支持通配 / 正则**：写错一条通配规则的后果是整站进重定向循环，而这类
规则恰恰最难在编辑器里一眼看出对不对。需要批量时，几条明确的记录比一条聪明的规则可靠。

**只跳一跳**：目标又是另一条规则的源时不继续解析。多跳解析要防环、要限深，收益只是省
访客一次请求——真串起来了浏览器自己会走完，且它本来就有环保护。

**目标只放行站内路径与 `http(s)://`**。`//evil.example` 与 `/\evil.example` 单看都以 `/`
开头，但浏览器把它们当协议相对的**外站**地址——只判首字符就是一个开放重定向，两种写法
都单独挡掉了（`shared/site-redirect.ts`）。

**404 是一张模板页**（kind `not_found`，固定路径 `/404`），和首页、会员登录同一套机制：
出现在中台常驻模板区，租户用同一个编辑器排版、同一套发布流程上线，也能「重设为最新
版式」。必备段是 `page-missing`（大号状态码 + 标题 + 回首页），编辑器不给删，保存时
校验有且仅有一段。不进公开导航、不进 sitemap，状态码仍然是 **404**，且强制 `noindex`——渲染出
内容不代表这个地址存在，返 200 会让搜索引擎把每个死链都当成一张真页面收录（soft 404）。
没发布这张页时用内置兜底：仍套站点页头页脚与主题，正文就是同一段 `page-missing`
（跟站点语言走）。打开官网卡片时，没有这张模板的会快照落库；slug 为 `404` 的普通页
升成这个 kind；还没有必备段的 404 页整页换成当前预设。

用例见 `shared/site-redirect.test.ts`、`server/site-redirect.service.test.ts`、
`server/ssr-catch-all.test.ts`。

## SEO meta

| 能力 | 存哪 | 口径 |
| --- | --- | --- |
| 分享缩略图 | `theme_settings.og_image`（站点级）+ `page.settings.og_image`（逐页覆盖） | 相对路径按 origin 补成**绝对地址**——抓取器不带页面上下文；没图就整组图片标签不出（空 `content` 会被部分平台画成裂图），`twitter:card` 也相应退成 `summary` |
| 逐页 noindex | `page.settings.noindex` | 只掐收录，链接权重照常传递；同时从 sitemap 摘掉——留在 sitemap 又标 noindex 是自相矛盾的信号 |
| 会员页 noindex | 自动（`requires_member`） | `noindex, nofollow`：SSR 只有占位，收录了也是空页，所以连 follow 一起掐 |

og / twitter 的标题描述与 `<title>` / `description` **同源**，不另算一份。
`og_image` 只放行站内相对路径与 http(s)：同一个值也会进编辑器预览的 `<img src>`。

用例见 `server/ssr-seo.test.ts`。

## 表单段（贡献自 `site-form`）

表单段与提交记录**不在本模块**：它们是 `modules/site-form` 往这里的段注册表填的一项
（`site-form.form`），与文档库、店面同一条路子。marketing 这边只提供三样东西：

| 提供 | 位置 |
| --- | --- |
| 段注册表 | `shared/sections/index.ts` 的 `CONTRIBUTED`（`registerSiteSectionHtml` / `registerSiteSectionView`） |
| 存量 type 改写 | `shared/section-schema.ts` 的 `SECTION_TYPE_ALIASES`：`form` → `site-form.form` |
| 交互层挂载 | site-enhance 的贡献方入口（见下） |

细则见 `modules/site-form/MODULE.md`。

## 默认内容从哪来

| 内容 | 位置 | 说明 |
| --- | --- | --- |
| 通用初始化配方 | `shared/site-starters.ts` + `page-presets.ts` + `site-init.service.ts` | chrome + 对该站点已相关的模板页（常驻页建租户时快照；有开关的页开通时补建） |
| **默认租户产品站** | `server/default-product-site-content.ts` | Rewindom 终稿：中英双语首页（hero + 多段 prose + band）；文案来自 `client/locales` 的 `site` / `hero` / `features` / `landing` / `seo` |
| Bootstrap | `server/ensure-default-marketing-site.ts` | 默认租户幂等铺产品站并发布；已是产品站则跳过 |

新增页面：在 CMS Theme Editor 创建/发布即可；SEO 由 SSR + sitemap 动态生成。

## Nginx 分流

见 `docker/nginx/default.conf.template`：仅 `PLATFORM_HOST` 走静态 SPA；产品主域与其它 Host 的 HTML 反代 Fastify SSR；`/app` `/login` `/platform` 等仍走 SPA。

本地 Vite：`localhost` 文档导航代理到 `:3700` SSR；`127.0.0.1` 为平台控制台（不代理）。

SSR HTML 为 SEO 真相源；site-enhance 补交互层（会员入口、明暗切换、表单、会员正文）。

## 本地种子数据

```bash
# 默认租户：铺产品站终稿并发布；其它 slug：通用 starter
pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenantSlug]

# 只发首页的最小 SSR 冒烟
pnpm --filter server exec tsx scripts/seed-tenant-site-smoke.ts
```

`seed-local-marketing-site.ts` 对 `default` 走 `applyDefaultProductSite`，可反复执行覆盖终稿。

## 如何单独测试

```bash
pnpm --filter @rewindom/builtin exec vitest --run --project 'marketing/*'
curl -sS -H 'Host: {slug}.{TENANT_BASE_DOMAIN}' http://127.0.0.1:3700/ | head
```
