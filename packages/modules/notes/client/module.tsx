import { i18n, setupI18n } from "@be-water/client-kit";

import { NOTES_ENTITLEMENT } from "../shared/index.js";

import { NOTES_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { NOTES_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderNotesRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

setupI18n();

export const notesClientModule: ClientAppModule = {
  id: "notes",
  version: "1.0.0",
  label: "Notes",
  kind: "business",
  description: i18n.t("description", { ns: "notes" }),
  tenantEntitlements: [NOTES_ENTITLEMENT],
  client: {
    renderRoutes: renderNotesRoutes,
    nav: NOTES_NAV_SECTIONS,
    dashboardWidgets: NOTES_DASHBOARD_WIDGETS,
    // 底部 tab 只放高频业务入口；管理类页面走抽屉导航（见 MODULE.md）
    mobileTabPaths: ["/notes"],
  },
};
