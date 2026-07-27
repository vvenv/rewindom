import { renderRbacSuperUserRoutes } from "./RbacRoutes.js";
import { RBAC_NAV_SECTIONS } from "./shell/rbac-nav.js";
import { RbacPermissionProvider } from "./shell/rbac-permission-provider.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const rbacClientModule: ClientAppModule = {
  id: "rbac",
  version: "1.0.0",
  label: "RBAC / PBAC",
  kind: "infrastructure",
  description: "细粒度权限前端 Provider、角色管理页与权限管理 API hooks",
  requires: [],
  client: {
    renderSuperUserRoutes: renderRbacSuperUserRoutes,
    nav: RBAC_NAV_SECTIONS,
    shell: {
      shellProviders: [RbacPermissionProvider],
    },
  },
};
