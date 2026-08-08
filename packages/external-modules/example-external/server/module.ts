import {
  registerTenantGatedRoutes,
  type ServerAppModule,
  type ServerI18nBundle,
} from "@be-water/module-sdk/server";

import { EXAMPLE_EXTERNAL_ENTITLEMENT } from "../shared/entitlements.js";

import { EXAMPLE_EXTERNAL_SERVER_I18N } from "./i18n.js";
import { bookmarkRoutes } from "./bookmark.routes.js";

export const exampleExternalServerModule: ServerAppModule = {
  id: "example-external",
  version: "1.0.0",
  label: "External Bookmarks",
  kind: "business",
  description: "外部模块示例：租户内书签管理",
  requires: ["rbac", "audit"],
  tenantEntitlements: [EXAMPLE_EXTERNAL_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "example-external.read",
        label: "查看书签",
        group: "外部示例",
        description: "查看外部书签列表与详情",
      },
      {
        key: "example-external.write",
        label: "创建/编辑书签",
        group: "外部示例",
        description: "创建、编辑与删除外部书签",
      },
    ],
    auditActions: [
      { action: "EXTERNAL_BOOKMARK_CREATE", label: "创建书签" },
      { action: "EXTERNAL_BOOKMARK_UPDATE", label: "更新书签" },
      { action: "EXTERNAL_BOOKMARK_DELETE", label: "删除书签" },
    ],
  },
  server: {
    i18n: EXAMPLE_EXTERNAL_SERVER_I18N as ServerI18nBundle,
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(
        app,
        "example-external",
        async (scoped) => {
          await scoped.register(bookmarkRoutes, {
            prefix: "/api/example-external",
          });
        },
      );
    },
  },
};
