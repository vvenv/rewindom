import { registerTenantGatedRoutes } from "@be-water/server-kernel/runtime/register-tenant-gated-routes.js";

import { TENANT_MARKETING_ENTITLEMENT } from "../shared/entitlements.js";

import { MARKETING_SERVER_I18N } from "./i18n.js";
import { marketingDocCategoryRoutes } from "./marketing-doc-category.routes.js";
import { marketingDocRoutes } from "./marketing-doc.routes.js";
import { publicSiteRoutes } from "./public-site.routes.js";
import { siteContentRoutes } from "./site-content.routes.js";
import { siteRoutes } from "./site.routes.js";
import { marketingSsrRoutes } from "./ssr.routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const marketingServerModule: ServerAppModule = {
  id: "marketing",
  version: "1.0.0",
  label: "Marketing",
  kind: "infrastructure",
  description: "租户自助 Marketing CMS（主域绑定默认租户；其它 Host SSR）",
  // platform：官网 logo 默认继承租户品牌资产（未上传时才回落到手填 URL）
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
      { action: "SITE_DOC_CREATE", label: "创建文档" },
      { action: "SITE_DOC_UPDATE", label: "更新文档" },
      { action: "SITE_DOC_DELETE", label: "删除文档" },
      { action: "SITE_DOC_PUBLISH", label: "发布文档" },
      { action: "SITE_DOC_UNPUBLISH", label: "取消发布文档" },
      { action: "SITE_DOC_IMPORT", label: "导入文档" },
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
          await scoped.register(marketingDocRoutes, { prefix: "/api/site" });
          await scoped.register(marketingDocCategoryRoutes, {
            prefix: "/api/site",
          });
        },
      );
      await app.register(marketingSsrRoutes);
    },
  },
};
