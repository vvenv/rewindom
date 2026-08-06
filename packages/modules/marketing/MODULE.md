# module-marketing

## 用途

统一租户 CMS 官网（Fastify SSR）：

1. **产品主域**（`FRONTEND_URL` / `APP_DOMAIN` / 本地 `localhost`）：隐式绑定**默认租户**；bootstrap 幂等 apply `default` starter 并发布
2. **其它绑定域**（`custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}`）：对应租户的已发布站点
3. **平台控制台**在独立 Host（`PLATFORM_URL` / 本地 `127.0.0.1`），**不**走本模块 SSR

## 面划分

| 面           | 路由                                                                  | 目录                                         | 守卫                                           |
| ------------ | --------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| 公开（SSR）  | `/`、`/:slug`、嵌套路径（及 `/{locale}/…`）、`/sitemap.xml`、`/robots.txt` | `server/ssr.routes.ts` + `client/public/`    | Host 绑定（含主域→default）+ 站点已发布        |
| 租户中台     | `/app/site`、`/app/site/pages/:pageId`（Theme Editor）                        | `client/tenant/` + `client/pages/site-*.tsx` | entitlement `tenant-marketing` + `site.read` |

挂载点：`client.renderPublicRoutes`（SPA 接管）+ `client.renderRoutes`（CMS）+ `server.registerRoutes`。

`/` 由本模块占据，因此**登录后的落地页不是 `/`**，而是 `HOME_PATH_CANDIDATES` 解析出的路径。
外部链接想进应用一律指向 `/app`。平台管理员入口在 `PLATFORM_URL`。

公开页中台壳用 CMS `SiteChrome`；工作台页用 `PageLayout`。SSR 首屏不依赖客户端 Provider；会员入口等在 SPA 接管后生效。

## 租户 CMS 数据

| 模型            | 说明                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `MarketingSite` | 每租户一行：站名（可 `__i18n`）、标语、`theme_settings`、站点级 `published`；`nav_json` / `footer_json` 为**已发布**页头页脚，`nav_draft_json` / `footer_draft_json` 为编辑器草稿 |
| `MarketingPage` | `kind`: `home` \| `page`；`status`: `draft` \| `published`；`title` / `description` / `sections` / `settings` 为**已发布**正文，同名 `_draft` 四列为编辑器草稿（`settings` 即页面级画布覆盖，与正文同进同退） |

### Section schema（唯一真相源）

section 的定义分三层，`shared/section-schema.ts` 统一 re-export，调用方只 import 它：

| 文件                  | 职责                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `section-settings.ts` | setting 的类型系统 + 解析（`text`/`textarea`/`richtext`/`list`/`url`/`image`/`select`/`icon`/`range`/`checkbox`/`color` + 排版用 `header`/`paragraph`） |
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
| `header` | show_logo, show_site_name, sticky, layout(split\|centered), **显示项四开关**（见下）, primary/secondary 按钮（都无默认值） | `nav_link`{label\*, href}，最多 8（自定义链接，排在一级页之后） |
| `footer` | show_logo, blurb, copyright                                              | `footer_link`{group, label\*, href}，最多 24；同 `group` 的排进同一列 |

页头 / 页脚区渲染时**不许再包一层 `<header>` / `<footer>`**：`SiteHeader` 自己就是
`<header>`，外面套一层等高的祖先，`sticky` 就没有可粘的余量（sticky 只在包含块内部
移动），「吸顶」开关等于失效——而 SSR 把页头直接摊在 `#root` 下，症状是首屏吸得住、
SPA 一接管就掉下来。顺带也避免了嵌套 landmark。

### 页头右侧的四个显示项

`show_site_nav` / `show_locale_switcher` / `show_theme_toggle` / `show_account` 合成一组
「页头显示」，因为它们回答的是**同一个问题**：这枚入口露不露。能力本身另有出处，开关
只管露不露，关掉不等于关掉能力：

| 开关                    | 默认 | 能力由谁保证                                     |
| ----------------------- | ---- | ------------------------------------------------ |
| `show_site_nav`         | 开   | 已发布的一级页面                                 |
| `show_locale_switcher`  | 关   | 本页 `alternates`——没译文时开了也不会露          |
| `show_theme_toggle`     | 关   | 明暗内置且**永远跟随设备**；关掉只是不给手动按钮 |
| `show_account`          | 开   | 租户是否开通会员（site-member）                  |

语言切换器曾经是站点级设置（`theme_settings.show_locale_switcher`，
`20260804030000`）；`20260806030000_marketing_header_chrome_toggles` 把它搬回页头并回填
存量值。搬回来的理由是这四个开关本就该在一处配完，分成两处租户得跑两个地方排同一行按钮。

### 明暗模式

站点默认跟随访客设备，访客也可以手动改。公开站样式是**语义 class**
（`shared/marketing-site-css.ts`，镜像 `shared/marketing-site.css`），**不用 Tailwind**；
主题色由 `marketing-site-theme` 注入 CSS 变量。工作台 `/app` 仍用 `index.css` + Tailwind。

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

SSR **不**输出明暗切换按钮：它要 JS 才能工作（语言切换器能进 SSR 是因为那是纯 `<details>`）。
按钮由 SPA 接管后渲染，与账户入口同一处理——前提是 SPA 真的会到场，见下节。

### 会员入口（`show_account`）

未登录显示「登录」，登录后换成头像 + 账户下拉（账户页 / 退出登录）。marketing **不**实现它，
只在 `client/shell/site-member-slots.ts` 里声明 `siteMemberEntrySlot`；site-member 通过
`client.shell.publicProviders` 把组件填进来（方向：site-member → marketing）。

服务端有一份**对称的**注入点 `server/site-account-entry.ts`（`registerSiteAccountEntry`），
site-member 在 `onBoot` 里填。它回答两件事：本站有没有账户能力（`available`），
以及未登录态入口的 HTML（`html`）。三处宿主因此有了同一个真相源：

| 宿主                | 数据来源                      | 渲染                                       |
| ------------------- | ----------------------------- | ------------------------------------------ |
| SSR 首屏            | 服务端注入点                  | 未开通不输出；开通了直接给「登录」链接     |
| 租户站点前台（SPA） | `siteMemberEntrySlot`         | 真组件，按会员会话显示登录 / 账户下拉      |
| 主题编辑器预览      | `GET /api/site/capabilities`  | 开通了才灌 `SiteAccountEntryPreview`       |

三条以前各说各话：SSR 从不输出（开通了首屏也没有，登录按钮要等水合才跳出来，
爬虫与禁用 JS 的访客永远看不到）；编辑器无条件灌静态占位（没开通会员的站点，
预览里挂着一枚线上根本不存在的「登录」）；而 `show_account` 开关默认打开、随手可点，
打开后什么都不发生也没有任何提示。现在未开通时开关会置灰并写明原因
（`SettingsFields` 的 `unavailable`），预览也跟着不画。

编辑器不能借用真组件：它跑在工作台外壳里拿不到 `publicProviders`，而真组件判
「本站是否开通会员」是按**请求 Host** 走的，工作台域名下必然判不出来。所以预览
用静态占位，能力则单独问 `/api/site/capabilities`（marketing 自己的接口，值由注入点给）。

SSR 只画未登录那一态：会员 token 在 localStorage，不随 HTML 请求发送，服务端无从
知道访客是否已登录；已登录的访客水合后会换成头像下拉。

次按钮（secondary）**不**默认成登录：登录归账户入口管，两边都配就会并排出现两个「登录」。

### 绑定域上的 SPA 接管（交互层的前提）

nginx 把绑定域的**所有** HTML 文档反代给 Fastify SSR，因此租户站上一切要 JS 的东西
——账户入口、明暗切换、`requires_member` 页的正文——都取决于这份 SSR HTML 有没有把
SPA 带上。两件事缺一不可：

1. 正文包在 `<div id="root">` 里。`main.tsx` 走 `createRoot(getElementById("root")!)`，
   没有挂载点会直接抛。
2. `renderMarketingHtml({ spaBootstrapHtml })` 输出引导脚本，由
   `spa-entry.ts` 的 `renderSpaBootstrapHtml()` 按环境分流：

   - **生产**：从构建产物 `apps/client/dist/index.html` 里解析出带 vite 内容哈希的入口
     并缓存（容器 cwd 是 `/app`，本地是 `apps/server`，两处候选路径都试）。读不到就退化
     成纯静态 HTML —— 只跑服务端时不该因此 500。
   - **开发**：改用 vite dev server 的源码入口（react-refresh 前导 + `/@vite/client`
     + `/src/main.tsx`）。**不能**用 dist 里的哈希文件名——dev server 不 serve `dist/`，
     浏览器只会拿到 404，租户站的交互层在本地整个是死的；而 `dist/` 常有上一次构建的
     残留，所以分流看 `isProduction` 而不是「产物在不在」。

这两条曾经都不成立（`spaEntrySrc` 全仓无调用方、body 里没有 `#root`），结果是绑定域上
根本没有 JS：账户入口与明暗按钮永远不出现，会员页永远停在空占位。

同一条链上还有 nginx 的 SPA 前缀正则，必须与 `SITE_APP_PREFIXES` 一致——漏一个前缀，
那条路径会落进 `location /` 反代给 SSR，SSR 认出它属于应用区就 `callNotFound()`，
访客拿到 404 JSON。`member` 就这么漏过一次，由 `nginx-spa-prefixes.test.ts` 守住。

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
| `group`        | columns_layout, column_gap, align_items                                | `column`{sticky, stack_order}，最多 3；**容器 block**，见下                             |
| `band`         | headline\*, body, align, primary/secondary 按钮                        | —                                                                                       |

`*` = `required`，为空时该 section 校验失败。

**页面标题不再自动渲染**。以前非首页且首段不是带 headline 的 hero 就自动输出 h1 + 描述
（`sectionsLeadWithHero`）——标题出不出现取决于第一段碰巧是什么类型，租户在树上看不见、
也删不掉、更换不了位置。现在它就是 `page-header` 这一段：能排序、能删、能对齐。
文案留空时回落到页面 meta 的 title/description（`resolvePageHeaderText`，客户端与 SSR 共用
同一份，否则两边算出的 h1 会不一致），所以「新建页面自带标题」这个便利没丢，也不用把标题抄两遍。
存量页面由 `20260805010000_marketing_page_header_section` 在原本会自动出标题的页面前面补一段，
已发布官网的 h1 不会静默消失。

**`group` 是唯一的分栏原语**：一段里并排 2–3 列，列是 block、列里装任意子段
（`SiteBlock.sections`，由 `BlockDefinition.container` 声明）。列宽走一个比例预设
（`1:1` / `1:2` / `2:1` / `1:3` / `3:1` / `1:1:1` → 12 栏制，`resolveGroupSpans`），
比例与实际列数对不上时按列数等分回落；窄屏一律上下堆叠，顺序由列的 `stack_order` 调。
**嵌套只允许一层**——容器段不能装容器段，写路径抛 `site.sections_invalid`、读路径跳过，
编辑器的加段菜单里也不列出容器段。列内子段自动 `contained`：`width: full` 退化为 `page`、
不再自带左右 gutter（列已经限过宽）。「左侧同级菜单 + 右侧正文」的文档版式 = `1:3` 的
group + 左列放 `page-menu`(siblings/list, 列上勾 sticky)，不再有专门的侧栏机制。

每个页面级 section 另有一组**通用版式**（`layoutSettings()`，编辑器「版式」页签）：
`width` · `content_width` · `background`(none/muted/accent/outline) · `padding_top` / `padding_bottom`
· `spacing_above` / `spacing_below` · `divider`(none/top/bottom/both) · `anchor`。
以及一组**通用外观**（`styleSettings()`，编辑器「外观」页签）：
`bg_color` / `fg_color`（`#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA`，可带 alpha）·
`border_color` · `border_width` · `radius`（可继承）。
自定义 `bg_color` 覆盖 token 底色预设；空值不覆盖。
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
`spacing_*` 是段与段之间的缝。段间距默认继承主题的「区块间距」，滑块最左一格（哨兵负值，
见 `allow_inherit`）表示继承——和 padding 用同一种控件、同一个单位，租户不用先分清概念。

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

**加一段 = 三个文件 + 两行登记**，没有任何 switch 要改：

| 文件                                                   | 内容                     |
| ------------------------------------------------------ | ------------------------ |
| `shared/sections/<type>/definition.ts`                 | schema 声明              |
| `shared/sections/<type>/html.ts`                       | SSR 渲染（SEO 正文以它为准） |
| `client/components/sections/views/<type>.tsx`          | SPA React 视图           |

两行登记分别在 `shared/sections/index.ts`（声明表）与 `shared/sections/html.ts` +
`client/components/sections/section-views.ts`（两张渲染器表）。**两端渲染必须同构**：
一段的三个文件按 type 并置，漏改一端在 diff 里看得见。客户端与服务端各有一张表，
是因为两侧本就是两个 bundle（React 视图进不了 Fastify），与 `site-account-entry` 的
client / server 双注入点同一形状。

新增 setting 类型再在 `SettingsFields.tsx` 加一个分支。
`label` / `content` 存的是 i18n key（`marketing` namespace 下相对 key），shared 层不含展示文案。

`header` / `footer` 是站点级 chrome，不进段流：它们的渲染在
`shared/sections/{header,footer}/html.ts`（SSR）与 `SiteChrome.tsx`（SPA），
不套 `sec-band` 外壳，也不在上面两张渲染器表里。

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

读库兼容旧数据：type `features`→`feature-grid`、`cta`→`band`、`richtext`/`markdown`→`prose`；
字段 `cta_label`/`cta_href`→`primary_*`、`description`→`body`、band 的 `tone`→`background`、
`divider_top`/`divider_bottom`→`divider`、header 的 `show_login`/`login_label`→`secondary_*`
（href 曾写死 `/login`）；`settings.items[]` 自动提升为
blocks；`nav_json`/`footer_json` 的 `{label,href}[]` 自动迁成页头 / 页脚 blocks。
未知 block type 直接丢弃；`safeSections` 只跳过损坏的单个 section，不再整页清空。

路径约定：`home` → `/`；`page` → `/{slug}`（slug 可多段，如 `docs`、`docs/quickstart`）。
文档站用普通 page + `page-menu` section 拼出来，不再单独有 `doc` kind。
`pricing` / `docs` 不在保留 slug 里——绑定域名上归租户（平台页只在平台域名下有意义）。

**动态页面菜单**：在 Theme Editor 插入 `page-menu` section——父页选 `children`，子页选
`siblings`；条目随已发布页面目录自动更新，无需手填链接。要做成左侧栏就把它放进
`group` 的第一列（`1:3` + 列 sticky），没有 chrome 级的自动侧栏。

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

**SSR 只出静态结构，不带提交脚本**（同本模块既有口径：SSR 是 SEO 真相源，交互层由 SPA 接管）。
但 `onsubmit="return false"` 不能省——原生 `<form>` 在水合前被提交会直接导航走，
而这是**不引入 script 标签**就能挡住它的唯一办法。

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

SSR HTML 为 SEO 真相源；SPA 接管后补交互层（会员入口、明暗切换等）。

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
