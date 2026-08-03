import { registerTenantGatedRoutes } from "@be-water/server-kernel/runtime/register-tenant-gated-routes.js";

import { TENANT_MARKETING_ENTITLEMENT } from "../shared/entitlements.js";

import { MARKETING_SERVER_I18N } from "./i18n.js";
import { publicSiteRoutes } from "./public-site.routes.js";
import { siteRoutes } from "./site.routes.js";
import { marketingSsrRoutes } from "./ssr.routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const marketingServerModule: ServerAppModule = {
  id: "marketing",
  version: "1.0.0",
  label: "Marketing",
  kind: "infrastructure",
  description:
    "平台静态官网 + 租户自助 Marketing CMS（绑定 Host SSR）",
  requires: ["rbac", "audit"],
  tenantEntitlements: [TENANT_MARKETING_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "site.read",
        label: "查看租户官网",
        group: "租户官网",
        description: "查看站点设置与页面列表",
      },
      {
        key: "site.write",
        label: "编辑租户官网",
        group: "租户官网",
        description: "编辑、发布与删除官网页面",
      },
    ],
    auditActions: [
      { action: "SITE_UPDATE", label: "更新租户官网" },
      { action: "SITE_PAGE_CREATE", label: "创建官网页面" },
      { action: "SITE_PAGE_UPDATE", label: "更新官网页面" },
      { action: "SITE_PAGE_DELETE", label: "删除官网页面" },
      { action: "SITE_PAGE_PUBLISH", label: "发布官网页面" },
      { action: "SITE_PAGE_UNPUBLISH", label: "取消发布官网页面" },
    ],
  },
  server: {
    i18n: MARKETING_SERVER_I18N,
    registerRoutes: async (app) => {
      await app.register(publicSiteRoutes, { prefix: "/api/public" });
      await registerTenantGatedRoutes(app, "tenant-marketing", async (scoped) => {
        await scoped.register(siteRoutes, { prefix: "/api/site" });
      });
      await app.register(marketingSsrRoutes);
    },
  },
};
