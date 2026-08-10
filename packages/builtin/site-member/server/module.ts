import { registerTenantGatedRoutes } from "@be-water/server-kernel/runtime/register-tenant-gated-routes.js";

import { TENANT_SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";
import { registerMemberAuthTemplates } from "../shared/member-auth-templates.js";

import { SITE_MEMBER_SERVER_I18N } from "./i18n.js";
import { memberAuthPageRoutes } from "./member-auth.ssr.js";
import { registerMemberAuthSections } from "./member-auth-section.js";
import { registerMemberGateSection } from "./member-gate-section.js";
import { createMemberOAuthCallbackProvider } from "./member-oauth-callback.provider.js";
import { registerSiteMemberAccountEntry } from "./site-account-entry.js";
import { siteMemberAdminRoutes } from "./site-member-admin.routes.js";
import { siteMemberAuthRoutes } from "./site-member-auth.routes.js";
import { siteMemberOAuthRoutes } from "./site-member-oauth.routes.js";
import { registerSiteMemberSsrSessionResolver } from "./site-member-ssr-session.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const siteMemberServerModule: ServerAppModule = {
  id: "site-member",
  version: "1.0.0",
  label: "Site members",
  kind: "infrastructure",
  description: "站点前台会员身份（注册/登录/账户）与运营侧会员管理",
  // marketing：客户端把会员入口 / 门控组件填进站点前台的 slot（marketing 不反向依赖）
  requires: ["rbac", "audit", "platform", "marketing"],
  tenantEntitlements: [TENANT_SITE_MEMBER_ENTITLEMENT],
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
    ],
  },
  server: {
    i18n: SITE_MEMBER_SERVER_I18N,
    // 统一 IdP 回调（/api/auth/oauth/:provider/callback）里按 state.typ 分流到本 provider
    registerProviders: (registry) => {
      registry.setMemberOAuthCallbackProvider(
        createMemberOAuthCallbackProvider(),
      );
    },
    // 站点前台页头的账户入口：marketing 定义注入点，这里填实现（见 site-account-entry.ts）
    onBoot: async () => {
      registerSiteMemberAccountEntry();
      registerSiteMemberSsrSessionResolver();
      // 「会员专属内容」段：定义在本模块，渲染器填进 marketing 的段注册表
      registerMemberGateSection();
      // 会员登录 / 注册页：两张模板页 + 它们的必备段（版式归租户，表单归代码）
      registerMemberAuthTemplates();
      registerMemberAuthSections();
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
       * entitlement 由 resolveSiteTenant 在解析站点归属时一并校验。
       */
      await app.register(siteMemberAuthRoutes, {
        prefix: "/api/member",
      });
      await app.register(siteMemberOAuthRoutes, {
        prefix: "/api/member",
      });

      /*
       * 会员登录 / 注册**页面**（不是接口）：挂在根路径上，与官网 SSR 同一条渲染
       * 管线。静态路径比 marketing 的 `/:first/:second` 更具体，find-my-way 先命中
       * 这里；`/member/account` 等其余会员页仍落到 SPA 兜底。
       */
      await app.register(memberAuthPageRoutes);

      await registerTenantGatedRoutes(
        app,
        TENANT_SITE_MEMBER_ENTITLEMENT.key,
        async (scoped) => {
          await scoped.register(siteMemberAdminRoutes, {
            prefix: "/api/site-members",
          });
        },
      );
    },
  },
};
