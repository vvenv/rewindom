# site-billing

## 用途

**官网会员付费**：站点会员（`SiteMember`）向站点订阅付费。套餐由站点自己定义，钱收进
站点自己的通道账号。

与 [`billing`](../billing/MODULE.md) 是两个领域，别混：

| 领域 | 模块 | 谁付钱 | 买什么 | 收款账号 |
| --- | --- | --- | --- | --- |
| 平台租户付费 | `billing` | 组织（工作台用户） | `PRICING_PLANS` 里的平台套餐 | 平台 Creem |
| 官网会员付费 | `site-billing`（本模块） | 站点会员 | 站点自建的 `MemberPlan` | 站点自带 → 平台兜底 |

两边共用的只有**支付通道那层壳**（`PaymentProvider` 抽象与 Creem 封装，在 `billing`
里）。表、webhook、商品配置、权限、entitlement 全是各自一套。

## 面划分

| 面 | 路由 | 目录 | 所需权限 / 门控 |
| --- | --- | --- | --- |
| 公开（SSR） | `/member/billing`（GET 渲染 + POST 两种 intent） | `server/member-billing.ssr.ts` | 会员会话；未登录 302 去登录页 |
| 公开（段） | 任意页面上的 `site-billing.plans` | `server/plans-section.ts` | 会员会话（下单时） |
| 租户侧（套餐） | `/app/site-billing` | `client/pages/member-plans.tsx` | `site_billing.read`（写另需 `site_billing.write`） |
| 租户侧（流水） | `/app/site-billing/records` | `client/pages/member-records.tsx` | 同上（只读） |
| 管理 API | `/api/site-billing` | `server/site-billing.routes.ts` | PBAC |
| Webhook | `POST /api/site-billing/webhooks/creem` | 同上 | 免 JWT，按站点密钥验签 |

## 两个官网段 + 一张模板页

| 项 | type / kind | 落脚点 |
| --- | --- | --- |
| 会员套餐 | `site-billing.plans` | 任意页面（定价页通常不是会员页） |
| 我的订阅与付款 | `site-billing.account` | 只在 `member_billing` 模板页上（`page_kinds`）；外壳与登录 / 账户共用 `member-auth-card`（`memberCardSettings` + narrow 版式） |
| 模板页 | `member_billing` → `/member/billing` | 必备段是 `site-billing.account`，编辑器不给删；中台分组复用 site-member 的 `MEMBER_PAGE_TEMPLATE_GROUP`（「会员页版式」），不另开一组 |

## 访客入口

页面本身默认不落库，但**入口必须有**——否则会员找不到账单页：

| 入口 | 实现 |
| --- | --- |
| 页头账户菜单 | `registerMemberMenuLink` →「我的订阅」，与「账户」并列 |
| 「我的账户」↔「我的订阅」卡内互链 | 同一份 `listMemberSiblingLinks`（当前页剔自己），两边同款 `member-account-links` |
| 套餐段「当前套餐」 | 「管理订阅」链到 `/member/billing` |

两个段都是**真 `<form method="post">`**，action 固定 `/member/billing`，靠隐藏字段
`intent` 分流（`checkout` / `cancel`）——**没有 JS 也能下单和退订**，同会员登录表单的
理由：付费是入口性动作，不该押在一个可能加载失败的 bundle 上。

段的 settings 里**没有价格**：价格在 `MemberPlan` 上。官网写一个数、结账收另一个数是
这类页面最容易出的事故，把它从可配置项里去掉就不会发生。

**未配置套餐时**：公开面整段不渲染（访客不该看见一个空的定价区），但编辑器里**能加**
并显示一句「本站还没有可售的会员套餐」+ 去配置的链接——先排版后补数据是正常顺序，
而加完看见一片空白只会让人以为段坏了。section 视图只在主题编辑器渲染，所以这条提示
不会漏到公开面上。

按请求数据走 `SectionRenderContext.contributed["site-billing"]`，读写各收口在
`readSiteBillingContext` / `siteBillingContextEntry`。

## 收款凭证：平台 env → 站点覆盖

与 `oauth-credentials.ts` 同一口径。没配过的站点用平台默认账号收款（单租户部署里那就是
站长自己的账号）；配过的用自己的。密钥整包 JSON 加密后落 `TenantSetting.secret`
（`encryptTenantSecret`），**任何接口都不回传明文**，只回一个尾部片段。

设置页上明示当前来源（平台默认 / 本站点自己）——收款不像 OAuth，静默地用了别人的凭证
是要出事的，所以宁可多显示一行。

密钥表单收在 `SiteBillingProviderSheet` 里（三个字段常驻在套餐页上会把流水挤到折叠线
以下），但**当前来源与「缺 Webhook 密钥」留在套餐页的一行状态里**：套餐配得再好，收款
账号错了或没有验签密钥就一分钱也落不了地，这件事不该藏在一次点击之后。

## Webhook 的先有鸡还是先有蛋

验签密钥按站点，而站点 id 在报文里。做法是通道方案里的标准解：

1. 先**不验签**地从 raw body 抠出 `metadata.tenant_id`，**只**拿它去查密钥；
2. 用查到的密钥验签；
3. 通过之后一切以验过的 payload 为准，第 1 步的解析结果丢掉。

第 1 步读到的东西一个字都不能信——伪造一个 tenant_id 进来，最坏结果是拿错密钥、验签
失败、请求被拒。

## 依赖

`rbac`、`audit`、`platform`、`marketing`、`site-member`、`billing`

## 启用

- Server：`apps/server/src/enabled-modules.ts`
- Client：`apps/client/src/enabled-modules.ts`
- **没有 entitlement**：会员付费是每个站点都具备的能力，不可禁用。装了模块就在，
  能不能进那一页归权限（`site_billing.read` / `.write`）管。

## 扩展点

- 权限：`site_billing.read` / `site_billing.write`
- 审计：`SITE_BILLING_PLAN_CREATE` / `_UPDATE` / `_DELETE` / `SITE_BILLING_PROVIDER_UPDATE` / `SITE_BILLING_WEBHOOK_SYNC`
- 段：`site-billing.plans` / `site-billing.account`
- 模板页：`member_billing`
- 会员菜单链接：`registerSiteBillingMemberMenuLink`（挂进 site-member 的 `member-menu-links`）

## 路径三处对齐

`/member/billing` 是 SSR 例外路径，在**三处**各有一份，由
`marketing/server/nginx-spa-prefixes.test.ts` 盯着：

- `marketing/shared/site-locale.ts` 的 `SITE_SSR_EXCEPTION_PATHS`（真相源）
- `docker/nginx/default.conf.template`
- `apps/client/vite-marketing-ssr-proxy.ts`

## 如何单独测试

```bash
pnpm --filter @be-water/builtin exec vitest --run --project 'site-billing/*'
```

本地完整流程与 `billing/MODULE.md` 的一致，只有三处不同：webhook 打到
`/api/site-billing/webhooks/creem`；商品 ID 填在**套餐**上（不是 env 的
`CREEM_PRODUCT_MAP`）；下单入口在官网的 `site-billing.plans` 段上，不在工作台。
