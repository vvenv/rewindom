import { registerTenantGatedRoutes } from "@rewindom/module-sdk/server";

import { SITE_DOCS_ENTITLEMENT } from "../shared/entitlements.js";
import { registerDocsNavSources } from "../shared/nav-sources.js";
import { registerDocsPageTemplates } from "../shared/page-templates.js";
import { registerReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";

import { registerDocsPathHandler } from "./docs.ssr.js";
import { SITE_DOCS_SERVER_I18N } from "./i18n.js";
import "./preset-i18n.js";
import { registerDocsSections } from "./register.js";
import { registerDocsSearchBlockHtml } from "./search-block.js";
import { siteDocCategoryRoutes } from "./site-doc-category.routes.js";
import { siteDocRoutes } from "./site-doc.routes.js";

import type { ServerAppModule } from "@rewindom/module-sdk/server";

export const siteDocsServerModule: ServerAppModule = {
  id: "site-docs",
  version: "1.0.0",
  label: "Docs library",
  kind: "business",
  description: "站点文档库：Markdown 文档、分类与公开 /docs",
  requires: ["marketing", "rbac", "audit"],
  tenantEntitlements: [SITE_DOCS_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "docs.read",
        label: "查看文档库",
        group: "文档库",
        description: "查看站点文档与分类",
      },
      {
        key: "docs.write",
        label: "管理文档库",
        group: "文档库",
        description: "编写、发布、导入导出文档与分类",
      },
    ],
    auditActions: [
      { action: "SITE_DOC_CREATE", label: "创建文档" },
      { action: "SITE_DOC_UPDATE", label: "更新文档" },
      { action: "SITE_DOC_DELETE", label: "删除文档" },
      { action: "SITE_DOC_PUBLISH", label: "发布文档" },
      { action: "SITE_DOC_UNPUBLISH", label: "取消发布文档" },
      { action: "SITE_DOC_IMPORT", label: "导入文档" },
      { action: "SITE_DOC_CATEGORY_CREATE", label: "创建文档分类" },
      { action: "SITE_DOC_CATEGORY_UPDATE", label: "更新文档分类" },
      { action: "SITE_DOC_CATEGORY_DELETE", label: "删除文档分类" },
    ],
  },
  server: {
    i18n: SITE_DOCS_SERVER_I18N,
    onBoot: async () => {
      registerDocsPageTemplates();
      registerDocsNavSources();
      registerReservedPageSlug("docs");
      registerDocsSections();
      registerDocsSearchBlockHtml();
      registerDocsPathHandler();
    },
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, SITE_DOCS_ENTITLEMENT.key, async (scoped) => {
        await scoped.register(siteDocRoutes, { prefix: "/api/docs" });
        await scoped.register(siteDocCategoryRoutes, { prefix: "/api/docs" });
      });
    },
  },
};
