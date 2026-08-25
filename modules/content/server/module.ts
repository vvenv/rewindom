import {
  registerTenantGatedRoutes,
  type ServerAppModule,
} from "@rewindom/module-sdk/server";

import { CONTENT_ENTITLEMENT } from "../shared/entitlements.js";

import { contentRoutes } from "./content.routes.js";
import { failStaleGeneratingContents } from "./content.service.js";
import { CONTENT_SERVER_I18N } from "./i18n.js";

export const contentServerModule: ServerAppModule = {
  id: "content",
  version: "1.0.0",
  label: "Content",
  kind: "business",
  description: "用图片、视频和文字生成笔记与文章",
  requires: ["rbac", "audit"],
  tenantEntitlements: [CONTENT_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "contents.read",
        label: "查看内容",
        group: "内容生成",
        description: "查看内容列表与详情",
      },
      {
        key: "contents.write",
        label: "创建/编辑内容",
        group: "内容生成",
        description: "创建、编辑、生成与删除内容",
      },
    ],
    auditActions: [
      { action: "CONTENT_CREATE", label: "创建内容" },
      { action: "CONTENT_UPDATE", label: "更新内容" },
      { action: "CONTENT_DELETE", label: "删除内容" },
      { action: "CONTENT_GENERATE", label: "生成内容" },
    ],
  },
  server: {
    i18n: CONTENT_SERVER_I18N,
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "contents", async (scoped) => {
        await scoped.register(contentRoutes, { prefix: "/api/contents" });
      });
    },
    onBoot: async (ctx) => {
      const count = await failStaleGeneratingContents();
      if (count > 0) {
        ctx.log.warn({ count }, "marked stale content generations as failed");
      }
    },
  },
};
