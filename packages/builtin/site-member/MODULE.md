# site-member

## 用途

站点前台会员身份（注册 / 登录 / 我的账户）与运营侧会员管理。

会员是租户的**终端客户**，与工作台 `User` 并列的第 4 类 actor（`site_member`）：
独立表、独立会话、独立路由，不进 `/app`、不进 PBAC。

## 面划分

| 面 | 路由 | 目录 | 所需权限 / 门控 |
| --- | --- | --- | --- |
| 公开（SSR） | `/member/login`、`/member/register`（GET 渲染 + POST 提交） | `server/member-auth.ssr.ts` | 无；Host 绑定 + entitlement |
| 公开（SSR） | `/member/account`（GET 渲染 + POST 三种 intent） | `server/member-account.ssr.ts` | 会员会话；未登录 302 去登录页 |
| 公开（SPA） | `/member/oauth/callback` | `client/public/routes.tsx` | 无；走 `renderPublicRoutes` + `publicProviders` |
| 租户侧 | `/app/site-members` | `client/tenant/`、`client/pages/site-members.tsx` | `site_members.read`（写操作另需 `site_members.write`） |
| 会员 API | `/api/member/*` | `server/site-member-auth.routes.ts`、`site-member-oauth.routes.ts` | 登录态；路径白名单；OAuth 前缀免认证 |
| 管理 API | `/api/site-members` | `server/site-member-admin.routes.ts` | PBAC |

## 三张会员页：租户可排版的模板页

登录 / 注册 / 我的账户**都不是 SPA 路由**，是三张模板页（`member_login` /
`member_register` / `member_account`），与文档库的两张版式同一套机制
（`marketing/shared/page-templates.ts`）：

| 项 | 口径 |
| --- | --- |
| 版式 | 租户在 `/app/site` →「会员页版式」编辑；相关时由 marketing 快照落库。分组 key 是 `MEMBER_PAGE_TEMPLATE_GROUP`（本模块持有文案）；依赖方贡献的 `/member/*` 模板（如 site-billing 订阅页）必须复用，不得另开同名组 |
| 地址 | kind 决定 slug（`member-login` / `member-register` / `member-account`），租户改不了 |
| 必备段 | `site-member.login-form` / `.register-form` / `.account-panel`：编辑器不给删，服务端保存时校验有且仅有一段（`site.template_section_required`） |
| 段的落脚点 | 三段都声明了 `page_kinds`，只能出现在自己那张模板页上 |
| 表单 | 真 `<form method="post">`，**无 JS 也能登录 / 改密码 / 退出**；只有平台开了滑块验证码时才需要 JS（`enhance/member-auth.ts` 填滑块） |
| 版式共用 | 三段共用一张居中认证卡（`shared/site-css/member-auth.css`，assemble 后进 `site-css.generated.ts`）与同一组版式默认值（`member-page-settings.ts`：narrow + 64/80 内补白 + 卡片外框开关） |
| CSRF | 表单 POST 校验 `Origin` 同源（`site_member.form_origin_invalid`）——登录本身没有 cookie 可依赖 SameSite 拦 |
| 成功 | 种 cookie + **303** 跳 `redirect`（只认站内相对路径）；失败则原页回渲，带错误与回填的邮箱 |
| 站点未发布 | 照常渲染（`getSiteChromeOrFallback`）：登录是入口不是内容，租户没发官网时会员也得能登 |

账户页一张卡里三张表单，靠隐藏字段 `intent` 分流：`profile` 改昵称（303 回本页带
`?saved=1`）、`password` 改密码（吊销全部会话 + 清 cookie → 去登录页）、`logout` 退出
（清 cookie → 回首页）。全是 POST-重定向-GET，刷新不会重放提交。

JSON 接口（`POST /api/member/login`、`PATCH /api/member/profile` …）**保留**：OAuth
交换与第三方集成仍在用，只是 SPA 自己不再有会员表单页。

路由分流：这三条都是静态路径，比 marketing SSR 的 `/:first/:second` 更具体，
Fastify 先命中；`/member/oauth/callback` 仍落到 SPA。nginx 与 vite dev 各有一条例外
规则，三处由 `nginx-spa-prefixes.test.ts` 盯着对齐（真相源 `SITE_SSR_EXCEPTION_PATHS`）。

## 与 marketing 的边界

- marketing **不** import site-member（模板页 / 段 / SSR 会话都是「注册表定义在消费方，本模块填」）
- 公开 CMS：SSR 通过 `registerSiteAccountEntry` + `registerSiteMemberSsrSession` 读
  HttpOnly cookie，首屏输出登录态菜单并解锁门控页；`site-enhance` 仅绑登出 / 兜底升级
- 页头菜单可贡献链接：`shared/member-menu-links.ts`（依赖方如 site-billing 登记「我的订阅」；
  SSR / React / enhance 同读一份清单）。自助页互链另走 `listMemberSiblingLinks`（账户 +
  贡献项，当前页剔自己），账户 ↔ 订阅对称。
- SPA 上只剩 `/member/oauth/callback`（`renderPublicRoutes` + `SiteMemberAuthProvider`，cookie 会话）
- Theme Editor 预览用 marketing 的 `siteMemberEntrySlot` + 静态 `SiteAccountEntryPreview`
- `MarketingPage.visibility=members` 的公开端点只返回摘要；JSON 正文仍可走
  `/api/site/content/page`，公开站优先 SSR 解锁（失败时 enhance 拉 `page-html`）

## 权限与开关

| 位置 | 收窄方式 |
| --- | --- |
| 管理路由 | `requirePermission("site_members.read" / "site_members.write")` |
| 导航 | `anyPermission: ["site_members.read"]`；挂在「官网 CMS」分组 |
| entitlement | **没有**——会员体系是每个站点都具备的能力，不可禁用；能不能管归权限 |
| 会员自助 API | **不**套 `registerTenantGatedRoutes`（未登录时无 tenantContext）；站点归属在 `resolveSiteTenant` 校验 |

## 第三方登录（OAuth）

GitHub / Google / Microsoft。凭证走**平台 env → 站点覆盖**（`resolveSiteOAuthCredentials`，key=`site_oauth_providers`），
与工作台**不同**——工作台固定用平台凭证（`resolvePlatformOAuthCredentials`，不查库），
两条链路在类型上就是两个函数，谁也拿不到对方的入参。

配置入口在会员页顶部一行（`SiteOAuthStatusRow` + `SiteOAuthSheet`，`/api/site-members/oauth-providers`，
权限 `site_members.*`），与 `site-billing` 的收款凭证同一形态：一次性配置贴着它服务的那批数据。

Sheet 里三家上下排布，但只有脚上一颗保存：提交时逐个 PUT **改过**的那几家（三家覆盖存在
同一行 `TenantSetting`，并发会互相覆盖）。`client_secret` 留空表示沿用已存的，所以改回调
地址不必重新去 IdP 生成密钥；首次配置才要求 ID 与 secret 一起给全。

会员 Cookie 为 Host-only：平台应用只需登记与工作台相同的 `{FRONTEND_URL}/api/auth/oauth/:provider/callback`（按 `state.typ` 分流）；完成后若与发起 Host 不同源则发一次性 code，跳回发起 Host 的 `/member/oauth/callback` 再 `POST /api/member/oauth/exchange` 种 Cookie。

绑定表：`SiteMemberOAuthAccount`（`@@unique([tenant_id, provider, provider_user_id])`）；首次登录要求 IdP 已验证邮箱。

## 依赖

- `rbac`、`audit`、`platform`、`marketing`

## 启用

- Server：`apps/server/src/enabled-modules.ts`
- Client：`apps/client/src/enabled-modules.ts`
