import { USER_SERVER_I18N } from "./i18n.js";
import { userRoutes } from "./user.routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const userServerModule: ServerAppModule = {
  id: "user",
  version: "1.0.0",
  label: "Users",
  kind: "infrastructure",
  description: "租户用户 CRUD 与权限管理 API",
  requires: ["rbac", "audit", "platform"],
  shared: {
    permissions: [
      { key: "users.read", label: "查看用户", group: "用户管理" },
      { key: "users.write", label: "创建/编辑用户", group: "用户管理" },
      { key: "users.delete", label: "删除用户", group: "用户管理" },
    ],
  },
  server: {
    i18n: USER_SERVER_I18N,
    registerRoutes: async (app) => {
      await app.register(userRoutes, { prefix: "/api/users" });
    },
  },
};
