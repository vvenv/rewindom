import { getServerPermissionCatalog } from "@be-water/server-kernel/runtime/permission-catalog.js";

import { RBAC_SERVER_I18N } from "./i18n.js";
import {
  invalidateUserPermissionCache,
  PbacAuthzProvider,
  permissionMiddleware,
} from "./permission.middleware.js";
import { permissionRoutes } from "./permission.routes.js";
import { RoleService } from "./role.service.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const rbacServerModule: ServerAppModule = {
  id: "rbac",
  version: "1.0.0",
  label: "RBAC / PBAC",
  kind: "infrastructure",
  description: "细粒度权限控制（Policy-Based Access Control）",
  shared: {
    permissions: [
      { key: "roles.read", label: "查看角色", group: "权限管理" },
      { key: "roles.write", label: "管理角色", group: "权限管理" },
      { key: "roles.assign", label: "分配角色", group: "权限管理" },
    ],
  },
  server: {
    i18n: RBAC_SERVER_I18N,
    onBoot: async () => {
      const catalog = getServerPermissionCatalog();
      await RoleService.ensureBuiltinPlatformRoles(catalog);
    },
    registerMiddleware: async (app, ctx) => {
      ctx.registry.setAuthzProvider(new PbacAuthzProvider(app));
      await permissionMiddleware(app, ctx.registry);
    },
    registerRoutes: async (app) => {
      await app.register(permissionRoutes, { prefix: "/api" });
    },
  },
};

export { invalidateUserPermissionCache };
