import {
  registerTenantGatedRoutes,
  type ServerAppModule,
} from "@rewindom/module-sdk/server";

import { BOOKMARK_ENTITLEMENT } from "../shared/entitlements.js";

import { BOOKMARK_SERVER_I18N } from "./i18n.js";
import { bookmarkRoutes } from "./bookmark.routes.js";

export const bookmarkServerModule: ServerAppModule = {
  id: "bookmark",
  version: "1.0.0",
  label: "Bookmarks",
  kind: "business",
  description: "租户内书签管理",
  requires: ["rbac", "audit"],
  tenantEntitlements: [BOOKMARK_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "bookmark.read",
        label: "查看书签",
        group: "书签",
        description: "查看书签列表与详情",
      },
      {
        key: "bookmark.write",
        label: "创建/编辑书签",
        group: "书签",
        description: "创建、编辑与删除书签",
      },
    ],
    auditActions: [
      { action: "BOOKMARK_CREATE", label: "创建书签" },
      { action: "BOOKMARK_UPDATE", label: "更新书签" },
      { action: "BOOKMARK_DELETE", label: "删除书签" },
    ],
  },
  server: {
    i18n: BOOKMARK_SERVER_I18N,
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "bookmark", async (scoped) => {
        await scoped.register(bookmarkRoutes, { prefix: "/api/bookmarks" });
      });
    },
  },
};
