import {
  registerTenantGatedRoutes,
  type ServerAppModule,
} from "@rewindom/module-sdk/server";

import { TODO_ENTITLEMENT } from "../shared/entitlements.js";

import { TODO_SERVER_I18N } from "./i18n.js";
import { todoRoutes } from "./todo.routes.js";

export const todoServerModule: ServerAppModule = {
  id: "todo",
  version: "1.0.0",
  label: "Todos",
  kind: "business",
  description: "租户内待办清单",
  requires: ["rbac", "audit"],
  tenantEntitlements: [TODO_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "todo.read",
        label: "查看待办",
        group: "待办",
        description: "查看待办列表与详情",
      },
      {
        key: "todo.write",
        label: "创建/编辑待办",
        group: "待办",
        description: "创建、编辑、完成与删除待办",
      },
    ],
    auditActions: [
      { action: "TODO_CREATE", label: "创建待办" },
      { action: "TODO_UPDATE", label: "更新待办" },
      { action: "TODO_DELETE", label: "删除待办" },
      { action: "TODO_CLEAR_COMPLETED", label: "清除已完成待办" },
      { action: "TODO_TOGGLE_ALL", label: "批量切换待办完成态" },
    ],
  },
  server: {
    i18n: TODO_SERVER_I18N,
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "todo", async (scoped) => {
        await scoped.register(todoRoutes, { prefix: "/api/todos" });
      });
    },
  },
};
