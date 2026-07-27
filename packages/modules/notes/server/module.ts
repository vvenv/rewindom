import { registerTenantGatedRoutes } from "@be-water/server-kernel/runtime/register-tenant-gated-routes.js";

import { NOTES_ENTITLEMENT } from "../shared/entitlements.js";

import { noteRoutes } from "./note.routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const notesServerModule: ServerAppModule = {
  id: "notes",
  version: "1.0.0",
  label: "Notes",
  kind: "business",
  description: "租户内笔记 CRUD 金标准示例模块",
  requires: ["rbac", "audit"],
  tenantEntitlements: [NOTES_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "notes.read",
        label: "查看笔记",
        group: "示例模块",
        description: "查看笔记列表与详情",
      },
      {
        key: "notes.write",
        label: "创建/编辑笔记",
        group: "示例模块",
        description: "创建、编辑与删除笔记",
      },
    ],
    auditActions: [
      { action: "NOTE_CREATE", label: "创建笔记" },
      { action: "NOTE_UPDATE", label: "更新笔记" },
      { action: "NOTE_DELETE", label: "删除笔记" },
    ],
  },
  server: {
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "notes", async (scoped) => {
        await scoped.register(noteRoutes, { prefix: "/api/notes" });
      });
    },
  },
};
