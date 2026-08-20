---
name: site-section
description: 贡献或修改官网段、chrome 块、模板页（Theme Editor）。新增店面/会员/文档区块、固定路径页或页头按钮时使用。
---

# 官网段 / 模板页 / chrome 块

Rule：`.cursor/rules/site-section-css.mdc`、`.cursor/rules/site-section-i18n.mdc`
口径：`packages/builtin/marketing/MODULE.md`「业务模块贡献」
设计：`docs/design/i18n.md`（库存文案 vs 复制页面）

扩展已有模块的其它改动（字段、工作台页）用 `extend-module`；本 Skill 只覆盖 CMS 贡献面。
跨文件改动仍先填 FEATURE.spec（`surfaces` 含 `ssr` 或 `member`）。

## 何时使用

- 业务模块贡献或修改 **section**（页面区块）
- 页头 / 页脚里和语言切换同一排的 **chrome 块**（按钮，不是再往区域里塞一段）
- 路径固定的 **模板页**（登录、商店首页、文档版式）
- 用户说「加一个区块」「改店面版式」「页头加按钮」

## 第 0 步

缺项必须问，禁止猜：

| 字段 | 说明 |
| --- | --- |
| 贡献方模块 | 定义写在贡献方 `shared/`，**不要**改 marketing 内核 |
| 类型 | section / chrome 块 / 模板页 / 首页版式（可组合） |
| `type` 前缀 | 必须带模块前缀（`shop.product`、`shop.cart-link`）；撞名启动即抛 |
| `entitlement` | 有租户开关则声明；未开通不进「添加区块」、不渲染 |
| 库存文案 | setting `default` 与预设 `text` / `titleKey` 用 `ns:key`，禁止先 `t()` |

公告条是区域里的段（`band`）；购物车入口、会员入口走 chrome 块。

## 段（section）

定义与 markup **各只写一份**（贡献方 `shared/`，两端 import 同一对象）：

| 顺序 | 写 | 做什么 |
| --- | --- | --- |
| 1 | `<模块>/shared/xxx-section.ts`（或等价） | `SectionDefinition`；`type` 带前缀；按需 `entitlement`、`page_kinds`、`placements` |
| 2 | `<模块>/shared/sections/*-html.ts` | **一份** HTML 渲染器 |
| 3 | `<模块>/shared/site-css/<name>.css` | CSS 真源，只用官网 token（`--surface` / `--border` / `--muted-fg` / `--accent` / `--radius`） |
| 4 | `pnpm --filter @rewindom/builtin assemble:module-css` | 生成 `shared/site-css.generated.ts`（禁止手改） |
| 5 | server `onBoot` | `registerSiteSectionHtml(def, render, { css })` |
| 6 | client `module.tsx` | `registerSiteSectionView(def, htmlSectionView(render), { css })` |

两端从 **generated** 取 CSS 常量，不要从 `.css` 或手写 ts import。

```bash
pnpm --filter @rewindom/builtin assemble:module-css
```

金标准：shop 店面段（`modules/shop/shared/sections/`、`modules/shop/server/sections/register.ts`）。
CSS 金标准：`packages/builtin/site-member/shared/site-css/`。

**禁止** `shared/shop-css.ts`、`shared/foo-css.ts` 这类模板字符串——生产 server 是单文件 bundle，旁路 `.css` 读不了，手写字符串还逃过剥注释。

内置 marketing 段仍是 React + HTML 各一份（`packages/builtin/marketing/shared/sections/<type>/`）；业务贡献段不要再写一套 React 视图。

## 段要查库：`contributed` 两端各登记一次

段渲染器是同步的，要查库的数据从 `SectionRenderContext.contributed` 进：

| 面 | 登记 | 在哪 |
| --- | --- | --- |
| 实站 SSR | `registerSectionContextProvider` | server `onBoot`（`server/sections/register.ts`） |
| 编辑器预览 | `registerEditorContextProvider` | client manifest 顶层（`client/editor-context.ts`） |

两端都按 `sectionTypes` 按需调用（页面没摆那些段就一次查询都不发），单个 provider 抛错
只让它那一段不渲染。只登记 SSR 那边预览就是空白，只登记预览那边实站直接不渲染。

**两端的 `provide(input)` 都必须用 `input.locale`** —— 那是**当前选中页面的 locale**，
不是工作台界面语言。预览取数打后台接口时把它显式带成 `?locale=`（api client 的
`Accept-Language` 写的是界面语言），服务端路由用「显式 locale 优先于
`resolveRequestLocale`」取值。金标准：`modules/shop/client/editor-context.ts` +
`modules/shop/server/lib/request-locale.ts`。

数据多语言的回落两端走同一条（`resolveShopLocaleText` / `docsInLocale`），
不要在预览里另写一份取值逻辑。

## chrome 块

页头 / 页脚「和语言切换同一排的按钮」是 **block**，不是 section。

| 写 | 做什么 |
| --- | --- |
| `<模块>/shared/xxx.ts` | `BlockDefinition`，含 `chromeSlotSettings()`（否则永远钉在第一行左边） |
| `<模块>/shared/sections/*-html.ts` | **一份** HTML 渲染器 |
| server | `registerChromeBlockHtml(def, render, { css })` |
| client | `registerChromeBlockView(def, htmlChromeBlockView(render), { css, icon })` |

`type` 带模块前缀；`entitlement` 闸门同样生效。金标准：shop `shop.cart-link`。

**图标控件必须挂 class `chrome-control`**——同排并列，尺寸由页头 / 页脚上的
`--chrome-control-*` token 决定（页头 2rem 工具栏，页脚跟 `.chrome-text` 对齐），
不要自己写 `height: 2rem`。带文字时放 `<span>`，只放开宽度。内含 16×16 内联 SVG。
纯图标形态**必须**补 `aria-label`（图标已 `aria-hidden`，不补就是没有名字的控件）。
细则见 `site-section-css` rule。

想让块支持「只显示图标」时，开关写成 `icon_only`（默认 `false`），**不要**写成
`show_label`（默认 `true`）：`settingBool` 是严格 `=== true`，键缺失一律当 false，
后者会让任何缺这个键的存量块默默变成没有文字的按钮。

## 公开站交互脚本（enhance）

公开站不挂 React。段需要交互（提交、切换、展开）时，贡献方写
`<模块>/client/enhance/index.ts` 并导出 **`enhanceSite(ctx)`**——marketing 的
`site-enhance/assemble.mjs` 扫目录发现它，拼进同一个 IIFE（公开站仍只发一个脚本）。

| 写 | 做什么 |
| --- | --- |
| `<模块>/client/enhance/index.ts` | `export function enhanceSite(ctx: SiteEnhanceContext): void` |
| `pnpm --filter @rewindom/builtin assemble:site-enhance` | 重新打包，生成物随提交入库 |

`ctx` 是当前页面的语言与路径快照，别自己去翻 marketing 的 DOM 属性。事件用委托挂在
`document` 上：会员正文那类局部替换会把段重新插进来，逐个绑会漏。金标准：`site-form`。

**禁止**把贡献方的脚本写进 `marketing/client/enhance/`——那等于让内核 import 业务模块。

## 模板页

路径固定、每种语言最多一张（登录、`/shop`、`/docs`）。**不要**自己写初始化，**不要**做「自定义版式」空态。

同一路径模式、多条实例（`/shop/:slug`、`/topics/:slug`）仍是**一张**模板页：kind 唯一、每种语言一张，路径参数由 path handler 填。不要给每个格子各建一张 CMS 页，也不要在另一张页上长覆盖字段。金标准：`events_detail`、`events_topic`、shop collection。

| 写 | 登记 |
| --- | --- |
| `<模块>/shared/*-page-templates.ts` | 同一函数里 `registerPageTemplateKind` + `registerPageTemplatePreset` |
| server `onBoot` + client manifest | 各调一次（幂等） |

有租户开关必须声明 `entitlement`。marketing 在相关时快照落库（建租户 / 开通开关 / 打开 `/app/site`）。SSR 在记录尚未落库时用内置预设兜底——那是缺口不是产品路径。

`pnpm check:modules` 会挡：kind 缺 preset、有开关却没声明 entitlement、客户端「自定义版式」。

金标准：`packages/builtin/site-member/shared/member-page-templates.ts`、`modules/shop/shared/shop-page-templates.ts`。

必备段用 `required_section`；段自己用 `page_kinds` 声明只能落在哪张页面上。

## 首页版式

首页只有一张（`kind: home`，路径 `/`）。marketing 内核只留空白槽位，不预填段。
模块可以另外贡献一套首页版式，让租户把站点根换成自己的段组合。与模板页正交：`/shop`
仍是枢纽页；事件雷达的专题 / 详情 / 实体走独立集合路径（`/topics/:slug`、
`/events/:slug`、`/entities`）。

店面 / 文档库通常不必贡献——它们的入口就是自己的模板页。事件雷达这类「站点根就应该
是本模块」的产品应当贡献。

| 写 | 登记 |
| --- | --- |
| 与模板页同一份 `*-page-templates.ts` | `registerHomeLayout({ key, label, group?, entitlement?, rootPrefix?, preset })` |

`preset.kind` 必须是 `home`；有开关必须声明 `entitlement`。`group` 与本模块模板页共用同一个 i18n key 时，中台常驻模板区把版式和页面排在同一组；未声明则只进站点设置下拉。内核空白首页不声明 `group`、不进常驻模板区。要把本模块公开前缀收到站点根时
加 `rootPrefix`（如 `/docs`）：选择器不再把该枢纽列为「设为首页」，套用会把
`home_path` 收回 `/`。事件雷达不声明 `rootPrefix`——首页版式只改 `/` 长什么样，集合路径
仍是 `/topics` `/events` `/entities`。金标准：`modules/events/shared/events-page-templates.ts` 的 `events.home`。

## 库存文案（数据 i18n）

- 预设 `text` / `titleKey` / `descriptionKey`、setting `default` 用 `ns:key`，与 `client/locales` 同一条
- 创建时展开成 `{ __i18n }` 整表，**不要**先 `t()` 成单语
- 1:1 模板段：同一条 key 写在 setting `default` 上（`headingSettings({ headingDefault: "site-member:login.title" })`）
- 复制到另一语言：仍等于 catalog 库存句 → 目标语言库存译文；租户改过 → 源语言原文当翻译起点
- 同一段被多张预设共用时不要硬塞一个 heading default

## CMS 插值（`{token}`）

库存文案、链接 href、页脚 `chrome_text` 走 `{token}`（与 Hugo / 页脚同一套），**不是**代码 i18n 的 `{{param}}`。

- 内置：`{year}` `{site}` `{hostname}` `{url}`（`site-interpolation.ts`）
- 模块经 `contributed.interpolation` 贡献（events：`{topic}` `{topic_slug}` `{feed}` `{event}` `{headline}` `{entity}` `{entity_kind}`）；多个 provider **按 key 合并**，不要 `Object.assign` 整包覆盖
- **页面设置的标题 / 描述**走同一套插值，进 `<title>` / meta；带 `:slug` 的模板在 kind 上声明 `interpolation_tokens`，预设默认带上这些 token。path handler 不要覆盖 title/description
- 未识别的 `{foo}` 原样留下
- 链接空路径段 / 空查询值渲染时收掉：`/topics/{topic_slug}/feed.xml` 在没有当前主题时是 `/topics/feed.xml`。当前页 RSS 请用 `{feed}`
- **不要**在渲染器里暗改租户填的 href；把 token 写进存下来的地址，看得见、改得动

金标准：`packages/builtin/marketing/shared/site-interpolation.ts`、events 专题页 hero。

## 公开路径（非 MarketingPage）

不是 CMS 页的公开地址（如 `/docs`）不要写进 `renderPath`。模块登记 `registerSitePathHandler`（前缀路径；可带 `canonicalRedirect` 把旧前缀 301 到规范地址）、`registerSitePathFallback`（CMS 未命中后再认，`render` 返回 null 不直接 404）、`registerReservedPageSlug`、sitemap / link-target providers。金标准：`site-docs`；类型化集合路径：`events`（`/topics` `/events` `/entities` `/feed.xml`）。

## 交付

- [ ] CSS 真源是 `shared/site-css/*.css`，没有手写 `*-css.ts`，generated 已 assemble 并提交
- [ ] 模板页 kind 与 preset 成对；有开关则声明了 `entitlement`
- [ ] 要查库的段：SSR 与预览两个 provider 都登记了，且都按 `input.locale`（页面语言）取数
- [ ] `pnpm check:modules`、`pnpm check:i18n`
- [ ] 未开通 entitlement 时不进菜单、不渲染

## 禁止

- 改 marketing 内核来「顺便登记」业务段——注册表在 marketing，**填表的是贡献方**
- 为编辑器再写一套与 SSR 不同的 React markup（业务贡献段用 `htmlSectionView`）
- 预览取数跟着工作台界面语言走——同一段会在预览与实站显示两份文案
- 自己写模板页初始化或「自定义版式」空态
- 预设文案先 `t()`，或 preset key 与 setting `default` 不是同一条 `ns:key`
- 在渲染器里暗改租户填的 href（把 `{token}` 写进存下来的地址）
