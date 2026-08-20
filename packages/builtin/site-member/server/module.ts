import { registerTenantGatedRoutes } from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";

import { SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";
import { registerMemberMenuLink } from "../shared/member-menu-links.js";
import { registerMemberPageTemplates } from "../shared/member-page-templates.js";

import { SITE_MEMBER_SERVER_I18N } from "./i18n.js";
import { registerMemberAccountSection } from "./member-account-section.js";
import { memberAccountPageRoutes } from "./member-account.ssr.js";
import { registerMemberAuthSections } from "./member-auth-section.js";
import { memberAuthPageRoutes } from "./member-auth.ssr.js";
import { registerMemberGateSection } from "./member-gate-section.js";
import { createMemberOAuthCallbackProvider } from "./member-oauth-callback.provider.js";
import { registerSiteMemberAccountEntry } from "./site-account-entry.js";
import { siteMemberAdminRoutes } from "./site-member-admin.routes.js";
import { siteMemberAuthRoutes } from "./site-member-auth.routes.js";
import { siteMemberOAuthRoutes } from "./site-member-oauth.routes.js";
import {
  registerSiteMemberSsrSessionResolver,
  resolveMemberSsrSession,
} from "./site-member-ssr-session.js";
import { siteOAuthProvidersRoutes } from "./site-oauth.routes.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const siteMemberServerModule: ServerAppModule = {
  id: "site-member",
  version: "1.0.0",
  label: "Site members",
  kind: "infrastructure",
  description: "站点前台会员身份（注册/登录/账户）与运营侧会员管理",
  // marketing：客户端把会员入口 / 门控组件填进站点前台的 slot（marketing 不反向依赖）
  requires: ["rbac", "audit", "platform", "marketing"],
  tenantEntitlements: [SITE_MEMBER_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "site_members.read",
        label: "查看站点会员",
        group: "站点会员",
        description: "查看站点会员列表",
      },
      {
        key: "site_members.write",
        label: "管理站点会员",
        group: "站点会员",
        description: "启用/停用会员、重置密码与删除会员",
      },
    ],
    auditActions: [
      { action: "SITE_MEMBER_REGISTER", label: "会员注册" },
      { action: "SITE_MEMBER_UPDATE", label: "更新会员" },
      { action: "SITE_MEMBER_DELETE", label: "删除会员" },
      { action: "SITE_MEMBER_PASSWORD_RESET", label: "重置会员密码" },
      { action: "SITE_MEMBER_OAUTH_UPDATE", label: "更新会员第三方登录" },
    ],
  },
  server: {
    i18n: SITE_MEMBER_SERVER_I18N,
    // 统一 IdP 回调（/api/auth/oauth/:provider/callback）里按 state.typ 分流到本 provider
    registerProviders: (registry) => {
      registry.setMemberOAuthCallbackProvider(
        createMemberOAuthCallbackProvider(),
      );
      registry.setSiteMemberSessionProvider({
        resolve: resolveMemberSsrSession,
      });
      registry.setMemberMenuLinksProvider({
        register: (link) => registerMemberMenuLink(link),
      });
    },
    // 站点前台页头的账户入口：marketing 定义注入点，这里填实现（见 site-account-entry.ts）
    onBoot: async () => {
      registerSiteMemberAccountEntry();
      registerSiteMemberSsrSessionResolver();
      // 「会员专属内容」段：定义在本模块，渲染器填进 marketing 的段注册表
      registerMemberGateSection();
      // 会员的三张页面：模板页 + 各自的必备段（版式归租户，表单归代码）
      registerMemberPageTemplates();
      registerMemberAuthSections();
      registerMemberAccountSection();
    },
    registerRoutes: async (app) => {
      /*
       * 顶层命名空间，**不能**挂在 marketing 的 `/api/site` 之下：那边是租户管理
       * 接口（要 site.read / site.write），把一组对公网免认证的接口嵌进去，
       * 鉴权中间件就只能逐条列白名单把它们从「需认证」里挖出来——受众不同的接口
       * 不该共用命名空间。
       *
       * 也**不能**套 registerTenantGatedRoutes：注册/登录是免认证的，
       * 那时还没有 request.tenantContext，网关会直接崩。
       * 会员开关由 resolveSiteTenant 在解析站点归属时一并校验。
       */
      await app.register(siteMemberAuthRoutes, {
        prefix: "/api/member",
      });
      await app.register(siteMemberOAuthRoutes, {
        prefix: "/api/member",
      });

      /*
       * 会员的三张**页面**（不是接口）：登录、注册、我的账户。挂在根路径上，与官网
       * SSR 同一条渲染管线。静态路径比 marketing 的 catch-all `/*` 更具体，
       * find-my-way 先命中这里；`/member/oauth/callback` 仍落到 SPA 兜底。
       */
      await app.register(memberAuthPageRoutes);
      await app.register(memberAccountPageRoutes);

      /*
       * 运营侧：会员管理与会员 OAuth 配置。这两组是**认证后**的租户接口，走标准的
       * 开关网关——站点关掉会员功能，中台这块整体消失（前端 nav 也随 manifest 隐藏）。
       */
      await registerTenantGatedRoutes(
        app,
        SITE_MEMBER_ENTITLEMENT.key,
        async (scoped) => {
          await scoped.register(siteMemberAdminRoutes, {
            prefix: "/api/site-members",
          });
          // 会员登录的 OAuth 覆盖：与会员管理同一命名空间、同一套权限
          await scoped.register(siteOAuthProvidersRoutes, {
            prefix: "/api/site-members",
          });
        },
      );
    },
  },
};
