import { registerTenantGatedRoutes } from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";

import { TENANT_MARKETING_ENTITLEMENT } from "../shared/entitlements.js";

import { MARKETING_SERVER_I18N } from "./i18n.js";
import { publicSiteRoutes } from "./public-site.routes.js";
import { siteContentRoutes } from "./site-content.routes.js";
import {
  ensureTenantTemplatePages,
  initializeTenantSite,
} from "./site-init.service.js";
import { siteRoutes } from "./site.routes.js";
import { marketingSsrRoutes } from "./ssr.routes.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const marketingServerModule: ServerAppModule = {
  id: "marketing",
  version: "1.0.0",
  label: "Marketing",
  kind: "infrastructure",
  description: "租户自助 Marketing CMS（主域绑定默认租户；其它 Host SSR）",
  requires: ["rbac", "audit", "platform"],
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
      { action: "SITE_FORM_SUBMISSION_DELETE", label: "删除官网表单提交" },
      { action: "SITE_REDIRECT_SAVE", label: "保存官网重定向" },
      { action: "SITE_REDIRECT_DELETE", label: "删除官网重定向" },
      { action: "SITE_ASSET_DELETE", label: "删除官网媒体" },
      { action: "SITE_PAGE_VERSION_RESTORE", label: "恢复官网页面历史版本" },
    ],
  },
  server: {
    i18n: MARKETING_SERVER_I18N,
    registerRoutes: async (app) => {
      await app.register(publicSiteRoutes, { prefix: "/api/public" });
      // 会员读正文：独立前缀，不进工作台 entitlement 网关（见 site-content.routes）
      await app.register(siteContentRoutes, { prefix: "/api/site/content" });
      await registerTenantGatedRoutes(
        app,
        "tenant-marketing",
        async (scoped) => {
          await scoped.register(siteRoutes, { prefix: "/api/site" });
        },
      );
      await app.register(marketingSsrRoutes);
    },
    onBoot: async (ctx) => {
      // 对该站点相关的模板页快照进 DB；开通开关时再补建刚变得相关的那些
      ctx.events.on("tenant.created", async (payload) => {
        try {
          await initializeTenantSite(payload.tenant_id, payload.default_locale);
        } catch (err) {
          ctx.log.error(
            { err, tenant_id: payload.tenant_id },
            "[marketing] initializeTenantSite failed",
          );
        }
      });
      ctx.events.on("tenant.entitlements.updated", async (payload) => {
        try {
          await ensureTenantTemplatePages(payload.tenant_id);
        } catch (err) {
          ctx.log.error(
            { err, tenant_id: payload.tenant_id },
            "[marketing] ensureTenantTemplatePages failed",
          );
        }
      });
    },
  },
};
