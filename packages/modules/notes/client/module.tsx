import { NOTES_ENTITLEMENT } from "../shared/index.js";

import { NOTES_I18N } from "./i18n.js";
import { NOTES_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { NOTES_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderNotesRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const notesClientModule: ClientAppModule = {
  id: "notes",
  version: "1.0.0",
  label: "Notes",
  kind: "business",
  description: "租户内笔记 CRUD 金标准示例模块",
  tenantEntitlements: [NOTES_ENTITLEMENT],
  client: {
    i18n: NOTES_I18N,
    renderRoutes: renderNotesRoutes,
    nav: NOTES_NAV_SECTIONS,
    dashboardWidgets: NOTES_DASHBOARD_WIDGETS,
    // 底部 tab 只放高频业务入口；管理类页面走抽屉导航（见 MODULE.md）
    mobileTabPaths: ["/notes"],
  },
};
