# module-useless

由 `scripts/gen-module.mjs` 从 `MODULE.spec.yaml` 生成。改需求请改 spec 后重新生成，
或在此记录手工偏离之处。

## 用途

无用句子库——每天一条没有用的话

## 面划分

| 面     | 路由      | 目录      | 所需权限                                   |
| ------ | --------- | --------- | ------------------------------------------ |
| 租户侧 | `/app/things` | `client/` | `things.read`（写操作另需 `things.write`） |

## 权限控制

四处必须同时收窄，缺一处就会出现「看得见点不进」或「点得进但请求 403」：

| 位置         | 文件                                                           | 收窄方式                                   |
| ------------ | -------------------------------------------------------------- | ------------------------------------------ |
| 路由         | `server/thing.routes.ts`                                       | `app.requirePermission`                    |
| 导航项       | `client/tenant/nav-sections.ts`                                | `anyPermission: ["things.read"]`           |
| 页面路由     | `client/tenant/routes.tsx`                                     | `PermissionRoute permission="things.read"` |
| 页面内写操作 | `client/pages/things.tsx`、`client/components/ThingsTable.tsx` | `hasPermission("things.write")`            |

## 公开站贡献

工作台负责录句子，**公开站上「今天那条」是一个贡献段**（`useless.today`），
租户在 Theme Editor 里把它摆到站点根或任意页面上。

| 面 | 登记 | 在哪 |
| --- | --- | --- |
| 实站 SSR 渲染 | `registerSiteSectionHtml` | `server/sections/register.ts`（模块 `onBoot`） |
| 实站 SSR 取数 | `registerSectionContextProvider` | 同上 |
| 编辑器「添加区块」 | `registerSiteSectionView` | `client/module.tsx` 顶层 |
| 编辑器预览取数 | `registerEditorContextProvider` | `client/editor-context.ts` |

**四处都要。** 漏 SSR 那两处实站不渲染，漏 client 那两处租户在编辑器里找不到 /
预览一片空白。

- 句子**直接进 HTML**，公开站不取数：关掉 JS 也看得见，没有 loading 态。因此本段
  不需要 site-enhance 脚本。
- 未开通 `useless` 开关的站点根本走不到渲染器（`marketing/shared/sections/html.ts`
  的 entitlement 闸门先返回空串）。
- 句子是纯文本、没有 locale map，所以两端 provider 都用不到 `input.locale`——不是漏了。
  正文哪天改成按语言存，两边都要跟着页面语言取数。
- CSS 真源是 `shared/site-css/useless.css`，改完必须跑
  `pnpm --filter @rewindom/builtin assemble:module-css`（生成物随提交入库）。
- 公开站上这一段 **fixed 铺满视口**（句子和可交互物都是），z-index 低于页头页脚：
  页头页脚始终显示并叠在舞台上面，段留白清零，日期行贴在页脚之上。
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

## 依赖

- `module-rbac`
- `module-audit`

## 如何单独测试

```bash
pnpm --filter @rewindom/useless test
```
