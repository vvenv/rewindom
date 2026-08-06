import { TODO_ENTITLEMENT } from "../shared/index.js";

import { TODOS_I18N } from "./i18n.js";
import { TODO_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { TODO_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderTodosRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const todosClientModule: ClientAppModule = {
  id: "todos",
  version: "1.0.0",
  label: "Todos",
  kind: "business",
  description: "租户内待办清单",
  tenantEntitlements: [TODO_ENTITLEMENT],
  client: {
    i18n: TODOS_I18N,
    renderRoutes: renderTodosRoutes,
    nav: TODO_NAV_SECTIONS,
    dashboardWidgets: TODO_DASHBOARD_WIDGETS,
    // 底部 tab 只放高频业务入口；管理类页面走抽屉导航（见 MODULE.md）
    mobileTabPaths: ["/app/todos"],
  },
};
