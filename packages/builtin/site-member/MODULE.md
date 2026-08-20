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
| 版式 | 租户在 `/app/site` →「会员页版式」编辑；**不预建**（`auto_init: false`），点那一行的「初始化版式」或开通会员开关时由 marketing 落库。分组 key 是 `MEMBER_PAGE_TEMPLATE_GROUP`（本模块持有文案）；依赖方贡献的 `/member/*` 模板（如 site-billing 订阅页）必须复用，不得另开同名组 |
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
  HttpOnly cookie，首屏输出登录态菜单并解锁门控页；`site-enhance` 绑登出，仅当页头
  已有访客登录钮时才兜底探测 `/api/member/me`（没有账户入口不打会员接口）
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
| entitlement | `site-member`（`shared/entitlements.ts`），**默认开**——存量站点不受影响；关掉就是「这个站点不做会员」：中台的会员管理与三张会员版式一起消失，公开面的注册 / 登录 / 账户也不可用。会员数据不动，重开即恢复 |
| 管理路由（`/api/site-members`） | 套 `registerTenantGatedRoutes(SITE_MEMBER_ENTITLEMENT.key)`；nav 随 client manifest 的 `tenantEntitlements` 隐藏 |
| 会员自助 API | **不**套 `registerTenantGatedRoutes`（未登录时无 tenantContext）；站点归属**与开关**都在 `resolveSiteTenant` 校验，SSR 页面走 `isSiteMemberEnabledForHost` |

关掉之后**站点前后台都不再出现会员相关内容**，一处一处是：

| 面 | 怎么消失 |
| --- | --- |
| 中台导航 / `/app/site-members` / 工作台卡片 | nav 项与卡片声明 `tenantModule`，路由套 `TenantModuleRoute` |
| 管理 API `/api/site-members` | `registerTenantGatedRoutes` |
| 公开会员接口 `/api/member/*` | `resolveSiteTenant` 抛 `site_member.not_enabled`（403） |
| `/member/login` `/register` `/account` | `isSiteMemberEnabledForHost` → 404 |
| 页头账户入口 | `resolveSiteAccountEntry` 返回 `available: false`（编辑器里 `chrome_account` 也点不动） |
| 四个会员段（登录 / 注册 / 账户 / 会员专属内容） | 段定义声明 `entitlement`：「添加区块」菜单不列，`parsePageSections` 也不渲染 |
| 三张会员版式 | 模板声明 `entitlement`，中台常驻模板区不露出 |
| 页面的「仅会员可见」开关 | 编辑器按 `capabilities.account_entry` 隐藏（**已经锁着的页面保持锁着**——放开等于把正文泄露给所有人） |
| 会员付费 `/member/billing` | `isSiteBillingEnabled` 两个开关都要（订阅挂在会员身上） |

三张会员版式声明了这个 entitlement + `auto_init: false`：开关关着不露出，开着也不预建
——不做会员的站点不该常驻三张删不掉的空版式。落库时刻只有两个：租户在 `/app/site` 点
「初始化版式」，或这个开关**由关变开**（`tenant.entitlements.updated` 的 `enabled_keys`）。
没落库时 SSR 仍按预设兜底，会员照样能登录。

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
