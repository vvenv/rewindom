# module-marketing

## 用途

双轨官网：

1. **平台主域**：产品介绍、使用文档、定价——**构建期预渲染**静态 HTML（爬虫拿完整正文）
2. **租户绑定域**（`custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}`）：租户自助 CMS（section 编排 + Markdown + 站点主题），由 **Fastify SSR** 输出完整 HTML（SEO）

## 面划分

| 面               | 路由                                                                            | 目录                                         | 守卫                                         |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| 公开（平台）     | `/`、`/pricing`、`/docs`、`/docs/:slug` 及 `/{locale}/...`                      | `client/public/`                             | 无                                           |
| 公开（租户 SSR） | `/`、`/:slug`、嵌套 `/:a/:b`（及 `/{locale}/…`）、`/sitemap.xml`、`/robots.txt` | `server/ssr.routes.ts`                       | Host 绑定 + 站点已发布                       |
| 租户中台         | `/site`、`/site/pages/:pageId`（Theme Editor）                                  | `client/tenant/` + `client/pages/site-*.tsx` | entitlement `tenant-marketing` + `site.read` |

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

| 模型            | 说明                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `MarketingSite` | 每租户一行：站名（可 `__i18n`）、标语、`theme_settings`、站点级 `published`；`nav_json` / `footer_json` 为**已发布**页头页脚，`nav_draft_json` / `footer_draft_json` 为编辑器草稿 |
| `MarketingPage` | `kind`: `home` \| `page`；`status`: `draft` \| `published`；`title` / `description` / `sections` 为**已发布**正文，`title_draft` / `description_draft` / `sections_draft` 为编辑器草稿；`settings`（占位） |

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

**页头 / 页脚区**（`nav_json` / `footer_json`，各存**一串** section，出现在所有页面上）。
区域本体（下表两行）不可删不可移——它就是这个区域本身；其余段随便加随便排。
某个段能放进哪个区域由它自己的 `placements` 声明（`sectionTypesFor(area)` 读它），
所以「页头加公告条」= 往区域里加一段 `band`，不用给 header 的 schema 再长字段：

| type     | settings                                                                 | blocks                                                                |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `header` | show_logo, show_site_name, sticky, show_site_nav（默认开：已发布一级页进顶栏）, layout(split\|centered), primary/secondary 按钮（secondary 默认 /login） | `nav_link`{label\*, href}，最多 8（自定义链接，排在一级页之后） |
| `footer` | show_logo, blurb, copyright                                              | `footer_link`{group, label\*, href}，最多 24；同 `group` 的排进同一列 |

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
其余语言走 `/{locale}/…` 子目录。路由规则集中在 `shared/site-locale.ts`（与平台官网的
`client/lib/marketing-locale-path.ts` 分开——平台那套按白名单认路径，租户页面是自助建的，
只能反过来排除应用区前缀）。locale 的 slug 占住了 `RESERVED_PAGE_SLUGS`，否则一个叫 `en`
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

页头的**语言切换器**是站点级开关（`theme_settings.show_locale_switcher`，在「官网 → 站点设置」里，
与主语言同一组），不是页头 section 的设置——它表态的是「这个站对外是不是多语言站」，
放进 section 会让租户在两处找同一件事。存量的页头 section 值由
`20260804030000_marketing_site_locale_switcher` 迁进 `theme_settings`。
候选语言仍逐页算（`page.alternates`），只列真的有已发布译文的语言。

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
主文档的样式表与明暗 / `data-theme` 克隆进 iframe，开发态用 MutationObserver 跟 HMR。
iframe body **不**硬铺 `var(--background)`——主站 body 是径向渐变；`embedded` 预览再套一层
与 `MarketingLayout` 相同的 `bg-background` 壳，观感与实站一致。

设备档位是**逻辑视口宽度**（桌面 1280 / 平板 768 / 手机 390），面板装不下时整体
等比缩小：缩放只改视觉尺寸，iframe 仍按逻辑宽度渲染，断点不受影响。桌面不能
「面板有多宽就多宽」——中间栏只有 600～800px，那样 `lg:` 永远不触发。

**选中高亮画在 iframe 外面**（`PreviewFrame` 的 overlay，按 `data-section-id` 取矩形
再乘缩放比）。画在里面躲不开三件事：macOS 覆盖式滚动条会盖住最右侧十几个像素、
祖先的 `overflow`、以及 sticky 页头的层叠上下文——通栏 section（`width: full`）的边缘
首当其冲。放到宿主文档后，站点渲染组件（也服务于公开站点）就不再带任何编辑器样式，
只留 `data-section-id` 与点击回调。矩形随滚动 / 面板缩放 / 内容编辑重算，用 rAF 合并。

**新增字段只改 schema + 两处渲染**：`client/components/sections/`（SPA）与
`server/ssr-sections.ts`（SEO HTML）。新增 setting 类型再在 `SettingsFields.tsx` 加一个分支。
`label` / `content` 存的是 i18n key（`marketing` namespace 下相对 key），shared 层不含展示文案。

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
- **中**：同页预览（`TenantSiteView`），点击任意区块即选中
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
已发布页面正文上线：`POST /api/site/pages/:id/content/publish`（将草稿列复制到 `title` / `description` / `sections`）。
首次发布页面：`POST /api/site/pages/:id/publish`（`status` → `published` 并同步正文草稿）。
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
主题色，并在主语言下创建或更新首页、文档与定价页（复用页面预设）。应用走
`POST /api/site/starters/:key/apply`，chrome 与页面**同一事务**落库。

**站点主题**（Logo / 主色 / 字体 / 页宽 / 区块间距）已从编辑器移出，并入「系统管理 → 品牌」（`/settings`）：
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

- 租户：`/api/site`、`/api/site/pages…`（含 `POST /pages/:id/duplicate`）、`/api/site/preview`（权限 `site.read` / `site.write`）
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
