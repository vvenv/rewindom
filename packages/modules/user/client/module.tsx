import { USER_NAV_SECTIONS } from "./shell/user-nav.js";
import { UserSidebarMenu, UserShellSlots } from "./shell/user-shell-slots.js";
import { renderUserSuperUserRoutes } from "./UserRoutes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const userClientModule: ClientAppModule = {
  id: "user",
  version: "1.0.0",
  label: "User Management",
  kind: "infrastructure",
  description: "租户用户管理页面与组件",
  client: {
    renderSuperUserRoutes: renderUserSuperUserRoutes,
    nav: USER_NAV_SECTIONS,
    shell: {
      sidebarUserMenu: UserSidebarMenu,
      shellProviders: [UserShellSlots],
    },
  },
};
