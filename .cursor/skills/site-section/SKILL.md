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
| 类型 | section / chrome 块 / 模板页（可组合） |
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

## chrome 块

页头 / 页脚「和语言切换同一排的按钮」是 **block**，不是 section。

| 写 | 做什么 |
| --- | --- |
| `<模块>/shared/xxx.ts` | `BlockDefinition`，含 `chromeSlotSettings()`（否则永远钉在第一行左边） |
| `<模块>/shared/sections/*-html.ts` | **一份** HTML 渲染器 |
| server | `registerChromeBlockHtml(def, render, { css })` |
| client | `registerChromeBlockView(def, htmlChromeBlockView(render), { css, icon })` |

`type` 带模块前缀；`entitlement` 闸门同样生效。金标准：shop `shop.cart-link`。

## 模板页

路径固定、每种语言最多一张（登录、`/shop`、`/docs`）。**不要**自己写初始化，**不要**做「自定义版式」空态。

| 写 | 登记 |
| --- | --- |
| `<模块>/shared/*-page-templates.ts` | 同一函数里 `registerPageTemplateKind` + `registerPageTemplatePreset` |
| server `onBoot` + client manifest | 各调一次（幂等） |

有租户开关必须声明 `entitlement`。marketing 在相关时快照落库（建租户 / 开通开关 / 打开 `/app/site`）。SSR 在记录尚未落库时用内置预设兜底——那是缺口不是产品路径。

`pnpm check:modules` 会挡：kind 缺 preset、有开关却没声明 entitlement、客户端「自定义版式」。

金标准：`packages/builtin/site-member/shared/member-page-templates.ts`、`modules/shop/shared/shop-page-templates.ts`。

必备段用 `required_section`；段自己用 `page_kinds` 声明只能落在哪张页面上。

## 库存文案（数据 i18n）

- 预设 `text` / `titleKey` / `descriptionKey`、setting `default` 用 `ns:key`，与 `client/locales` 同一条
- 创建时展开成 `{ __i18n }` 整表，**不要**先 `t()` 成单语
- 1:1 模板段：同一条 key 写在 setting `default` 上（`headingSettings({ headingDefault: "site-member:login.title" })`）
- 复制到另一语言：仍等于 catalog 库存句 → 目标语言库存译文；租户改过 → 源语言原文当翻译起点
- 同一段被多张预设共用时不要硬塞一个 heading default

## 公开路径（非 MarketingPage）

不是 CMS 页的公开地址（如 `/docs`）不要写进 `renderPath`。模块登记 `registerSitePathHandler`、`registerReservedPageSlug`、sitemap / link-target providers。金标准：`site-docs`。

## 交付

- [ ] CSS 真源是 `shared/site-css/*.css`，没有手写 `*-css.ts`，generated 已 assemble 并提交
- [ ] 模板页 kind 与 preset 成对；有开关则声明了 `entitlement`
- [ ] `pnpm check:modules`、`pnpm check:i18n`
- [ ] 未开通 entitlement 时不进菜单、不渲染

## 禁止

- 改 marketing 内核来「顺便登记」业务段——注册表在 marketing，**填表的是贡献方**
- 为编辑器再写一套与 SSR 不同的 React markup（业务贡献段用 `htmlSectionView`）
- 自己写模板页初始化或「自定义版式」空态
- 预设文案先 `t()`，或 preset key 与 setting `default` 不是同一条 `ns:key`
