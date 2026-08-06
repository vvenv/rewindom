import { registerTenantGatedRoutes } from "@be-water/server-kernel/runtime/register-tenant-gated-routes.js";

import { TENANT_SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";

import { SITE_MEMBER_SERVER_I18N } from "./i18n.js";
import { siteMemberAdminRoutes } from "./site-member-admin.routes.js";
import { siteMemberAuthRoutes } from "./site-member-auth.routes.js";

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
    registerRoutes: async (app) => {
      // 会员自助接口**不能**套 registerTenantGatedRoutes：注册/登录是免认证的，
      // 那时还没有 request.tenantContext，网关会直接崩。
      // entitlement 由 resolveSiteTenant 在解析站点归属时一并校验。
      await app.register(siteMemberAuthRoutes, {
        prefix: "/api/site/member",
      });

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
