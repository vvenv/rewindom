import { USER_DASHBOARD_WIDGETS } from "./dashboard-widgets.js";
import { USER_I18N } from "./i18n.js";
import { USER_NAV_SECTIONS } from "./shell/user-nav.js";
import { UserSidebarMenu, UserShellSlots } from "./shell/user-shell-slots.js";
import { renderUserSuperUserRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/client-kit";

export const userClientModule: ClientAppModule = {
  id: "user",
  version: "1.0.0",
  label: "User Management",
  kind: "infrastructure",
  description: "租户用户管理页面与组件",
  client: {
    i18n: USER_I18N,
    renderSuperUserRoutes: renderUserSuperUserRoutes,
    nav: USER_NAV_SECTIONS,
    dashboardWidgets: USER_DASHBOARD_WIDGETS,
    shell: {
      sidebarUserMenu: UserSidebarMenu,
      shellProviders: [UserShellSlots],
    },
  },
};
