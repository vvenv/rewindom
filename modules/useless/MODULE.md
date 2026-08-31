# module-useless

由 `scripts/gen-module.mjs` 从 `MODULE.spec.yaml` 生成。改需求请改 spec 后重新生成，
或在此记录手工偏离之处。

## 用途

无用之物——一件一件没有用的东西。公开站只出可交互物，而且不写字：
机制自己说话。seed 是图形 / 动画 / 交互（`tap` 要你动手，`auto` 自己在长）。

## 面划分

| 面     | 路由      | 目录      | 所需权限                                   |
| ------ | --------- | --------- | ------------------------------------------ |
| 租户侧 | `/app/things` | `client/` | `things.read`（写操作另需 `things.write`） |
| 公开站 | `/`、`/:slug` | `shared/sections/` | entitlement `useless` |

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置         | 文件                                                           | 收窄方式                                   |
| ------------ | -------------------------------------------------------------- | ------------------------------------------ |
| 路由         | `server/thing.routes.ts`                                       | `app.requirePermission`                    |
| 导航项       | `client/tenant/nav-sections.ts`                                | `anyPermission: ["things.read"]`           |
| 页面路由     | `client/tenant/routes.tsx`                                     | `PermissionRoute permission="things.read"` |
| 页面内写操作 | `client/pages/things.tsx`、`client/components/ThingsTable.tsx` | `hasPermission("things.write")`            |

## 公开站贡献

工作台负责录东西。**公开站是首页版式 + 一张详情模板页**：

| 页 | kind | 路径 | 必备段 |
| --- | --- | --- | --- |
| 首页 | `home`（版式 `useless.home`） | `/` | 目录段在版式预设里（首页 kind 本身没有必备段） |
| 详情 | `useless_thing` | `/:slug` | `useless.thing` |

列表上每一件是一张缩略图：seed 给可交互物截一张透明 PNG 写入媒体库（`Thing.thumbnail`），
有截图用截图，没有就把可交互物自己缩小放进格子。点进去才是详情舞台。名字不画。
舞台和画布不铺实心底，卡片的 `--surface` 会透出来，亮暗色都跟主题走。
目录段的区块标题可空：租户清空后不画抬头，也不借另一门语言的库存句顶上。

| 面 | 登记 | 在哪 |
| --- | --- | --- |
| 模板页 / 首页版式 | `registerUselessPageTemplates` | `shared/useless-page-templates.ts`（server `onBoot` 与 client 各调一次） |
| 实站 SSR 渲染 | `registerSiteSectionHtml` | `server/sections/register.ts` |
| 实站 SSR 取数 | `registerSectionContextProvider` | 同上（path fallback 已带数的页会 skip） |
| 公开路径 | `registerSitePathFallback` | `server/ssr/useless-path-handler.ts`（`/:slug`，CMS 页先赢） |
| 编辑器「添加区块」 | `registerSiteSectionView` | `client/module.tsx` 顶层 |
| 编辑器预览取数 | `registerEditorContextProvider` | `client/editor-context.ts` |

**四处段登记都要。** 漏 SSR 那两处实站不渲染，漏 client 那两处租户在编辑器里找不到 /
预览一片空白。模板页与首页版式两端都要登记，否则中台常驻模板区没有这两行。

- 句子与可交互物**直接进 HTML**，公开站不取数：关掉 JS 也看得见，没有 loading 态。
- 未开通 `useless` 开关的站点根本走不到渲染器（entitlement 闸门先返回空串），
  path handler 也不匹配。
- CSS 真源是 `shared/site-css/useless.css`，改完必须跑
  `pnpm --filter @rewindom/builtin assemble:module-css`（生成物随提交入库）。
- 详情页这一段 **fixed 铺满视口**，z-index 低于页头页脚。
  编辑器预览（`.is-embedded`）不钉视口，避免盖住工作台。

## 相对生成物的手工偏离

`gen-module.mjs` 的产出停在「能跑的单语版本」，下面几处是生成后补的。
**直接 `--force` 重新生成会把它们全部覆盖掉**，改需求请改 spec 后再把这几项手工补回。

| 偏离                       | 原因                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `server/i18n.ts`           | 生成器不产出；审计与报错按稳定 code 提供 zh-CN/en（见 `docs/design/i18n.md`）               |
| 审计用 `detail_key`        | 生成器仍写 `details: "创建无用：…"`，该字段已不在 `AuditLogEmitInput` 上——**tsc 会红**      |
| 错误用稳定 code            | 生成器写 `NotFoundError("无用不存在")`；改为 `useless.not_found` 等，路由统一 `sendCodedError` |
| `client/i18n.ts` + locales | 生成器不产出；组件原本把中文写死在 `toast` / 表头 / 空态里                                  |
| nav 用 `ns:key`            | 生成器写中文原文，会锁死为首屏语言；分组 key 借 `content:nav.section` 才能并进「内容」分组  |
| 路由 `/app` 前缀           | 生成器产出 `/things`，与 note / content 等实际约定的 `/app/<plural>` 不一致                 |
| 表单 `enabled` 初值        | 生成器给 `false`，与 Prisma 的 `@default(true)` 相反，新建即停用                            |
| 公开站首页 + 详情 | 生成器不产出；首页版式 `useless.home` + 详情模板 `/:slug`，段定义在 `shared/sections/` |

- `pnpm --filter @rewindom/useless exec tsx scripts/audit-useless.ts [标题...]`
  把每一条都装进无头 Chromium 跑一遍，只判一件事：**死没死**。
  标准是「要么自己会动，要么点了/敲了有反应」，两样都没有才算死——
  「静止等你动手」是好几条的正常样子。它抓不了「说的和做的是不是一回事」，
  那个得一条一条写探针（见下）。
- `pnpm --filter @rewindom/useless exec tsx scripts/probe-useless.ts <标题> <探针文件> [帧数]`
  把一条装进无头 Chromium、泵帧、跑一段取样 JS 再把数打出来。收东西前用它核对
  「这条东西到底有没有做到它说的那件事」——光看着像是不够的，好几条都是在这一步
  被发现说的和做的是反的。探针里可以用 `px()` / `pump(n)` / `tap(fx,fy)` / `drag(fx,fy)`。
  探针里**别用颜色阈值数像素**：细的抗锯齿线永远打不到 `r>200` 这种门槛，
  会得出「什么都没画」的假结论。改成把画面竖切成若干条报平均亮度，或者数某一列上穿过几条线。
- `pnpm --filter @rewindom/useless exec tsx scripts/_shot.ts <标题> <目录> "名字:帧数[:fx/fy],…"`
  按计划走一段并逐张截图。**舞台底色是透明的，务必在亮色上也看一眼**——
  浅奶油、浅蓝在亮色页上等于没有；读者要认领的那个东西一律走 `INK(a)`。
- `pnpm --filter @rewindom/useless exec tsx scripts/_claims.ts [标题…]`
  并排打印各条的「说法」（开头那段注释）。收东西前先查重：
  **机制重复比标题重复更常见，而标题重复有测试挡、机制重复没有。**
- `pnpm --filter server exec tsx scripts/seed-useless-demo.ts` 会给缺图的可交互物截图，写入媒体库。本机需要 Chromium（`pnpm --filter @rewindom/useless exec playwright install chromium`）。生产镜像没有浏览器，那条路径会跳过。HTML 变了、还是 JPEG、或缺图会再截；`USELESS_RECAPTURE_THUMBS=1` 则全部重截。

## 依赖

- `module-rbac`
- `module-audit`

## 如何单独测试

```bash
pnpm --filter @rewindom/useless test
```
