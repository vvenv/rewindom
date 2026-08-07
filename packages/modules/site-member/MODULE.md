# site-member

## 用途

站点前台会员身份（注册 / 登录 / 我的账户）与运营侧会员管理。

会员是租户的**终端客户**，与工作台 `User` 并列的第 4 类 actor（`site_member`）：
独立表、独立会话、独立路由，不进 `/app`、不进 PBAC。

## 面划分

| 面 | 路由 | 目录 | 所需权限 / 门控 |
| --- | --- | --- | --- |
| 公开（站点前台） | `/member/login`、`/member/register`、`/member/oauth/callback`、`/member/account` | `client/public/`、`client/pages/member-*.tsx` | 无；走 `renderPublicRoutes` + `publicProviders` |
| 租户侧 | `/app/site-members` | `client/tenant/`、`client/pages/site-members.tsx` | `site_members.read`（写操作另需 `site_members.write`） |
| 会员 API | `/api/member/*` | `server/site-member-auth.routes.ts`、`site-member-oauth.routes.ts` | 登录态；路径白名单；OAuth 前缀免认证 |
| 管理 API | `/api/site-members` | `server/site-member-admin.routes.ts` | PBAC + entitlement `tenant-site-member` |

## 与 marketing 的边界

- marketing **不** import site-member
- 公开 CMS：SSR 通过 `registerSiteAccountEntry` + `registerSiteMemberSsrSession` 读
  HttpOnly cookie，首屏输出登录态菜单并解锁门控页；`site-enhance` 仅绑登出 / 兜底升级
- `/member/*` 仍走 React（`renderPublicRoutes` + `SiteMemberAuthProvider`，cookie 会话）
- Theme Editor 预览用 marketing 的 `siteMemberEntrySlot` + 静态 `SiteAccountEntryPreview`
- `MarketingPage.visibility=members` 的公开端点只返回摘要；JSON 正文仍可走
  `/api/site/content/page`，公开站优先 SSR 解锁（失败时 enhance 拉 `page-html`）

## 权限与开关

| 位置 | 收窄方式 |
| --- | --- |
| 管理路由 | `requirePermission("site_members.read" / "site_members.write")` |
| 导航 | `anyPermission: ["site_members.read"]`；挂在「官网 CMS」分组 |
| entitlement | `tenant-site-member`（默认关闭） |
| 会员自助 API | **不**套 `registerTenantGatedRoutes`（未登录时无 tenantContext）；entitlement 在 `resolveSiteTenant` 校验 |

## 第三方登录（OAuth）

GitHub / Google / Microsoft。凭证解析与工作台相同：平台 env → 站点 `/app/settings/oauth` 覆盖。

会员 Cookie 为 Host-only：平台应用回调固定登记在 `FRONTEND_URL` 的 `/api/member/oauth/:provider/callback`，完成后发一次性 code，跳回发起 Host 的 `/member/oauth/callback` 再 `POST /api/member/oauth/exchange` 种 Cookie。

绑定表：`SiteMemberOAuthAccount`（`@@unique([tenant_id, provider, provider_user_id])`）；首次登录要求 IdP 已验证邮箱。

## 依赖

- `rbac`、`audit`、`platform`、`marketing`

## 启用

- Server：`apps/server/src/enabled-modules.ts`
- Client：`apps/client/src/enabled-modules.ts`
