import {
  registerTenantGatedRoutes,
  type ServerAppModule,
} from "@rewindom/module-sdk/server";

import { NOTE_ENTITLEMENT } from "../shared/entitlements.js";

import { NOTE_SERVER_I18N } from "./i18n.js";
import { noteRoutes } from "./note.routes.js";

export const noteServerModule: ServerAppModule = {
  id: "note",
  version: "1.0.0",
  label: "Notes",
  kind: "business",
  description: "租户内笔记 CRUD",
  requires: ["rbac", "audit"],
  tenantEntitlements: [NOTE_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "note.read",
        label: "查看笔记",
        group: "笔记",
        description: "查看笔记列表与详情",
      },
      {
        key: "note.write",
        label: "创建/编辑笔记",
        group: "笔记",
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
    i18n: NOTE_SERVER_I18N,
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "note", async (scoped) => {
        await scoped.register(noteRoutes, { prefix: "/api/notes" });
      });
    },
  },
};
