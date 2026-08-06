# site-member

## 用途

站点前台会员身份（注册 / 登录 / 我的账户）与运营侧会员管理。

会员是租户的**终端客户**，与工作台 `User` 并列的第 4 类 actor（`site_member`）：
独立表、独立会话、独立路由，不进 `/app`、不进 PBAC。

## 面划分

| 面 | 路由 | 目录 | 所需权限 / 门控 |
| --- | --- | --- | --- |
| 公开（站点前台） | `/member/login`、`/member/register`、`/member/account` | `client/public/`、`client/pages/member-*.tsx` | 无；走 `renderPublicRoutes` + `publicProviders` |
| 租户侧 | `/app/site-members` | `client/tenant/`、`client/pages/site-members.tsx` | `site_members.read`（写操作另需 `site_members.write`） |
| 会员 API | `/api/member/*` | `server/site-member-auth.routes.ts` | 登录态；路径白名单 |
| 管理 API | `/api/site-members` | `server/site-member-admin.routes.ts` | PBAC + entitlement `tenant-site-member` |

## 与 marketing 的边界

- marketing **不** import site-member
- 页头入口 / 门控 / 受限页加载器由 marketing 定义 slot，site-member 通过 `publicProviders` 填入
- `MarketingPage.visibility=members` 的公开端点只返回摘要；正文走 `/api/site/content/page`（会员 token）

## 权限与开关

| 位置 | 收窄方式 |
| --- | --- |
| 管理路由 | `requirePermission("site_members.read" / "site_members.write")` |
| 导航 | `anyPermission: ["site_members.read"]`；挂在「官网 CMS」分组 |
| entitlement | `tenant-site-member`（默认关闭） |
| 会员自助 API | **不**套 `registerTenantGatedRoutes`（未登录时无 tenantContext）；entitlement 在 `resolveSiteTenant` 校验 |

## 依赖

- `rbac`、`audit`、`platform`、`marketing`

## 启用

- Server：`apps/server/src/enabled-modules.ts`
- Client：`apps/client/src/enabled-modules.ts`
