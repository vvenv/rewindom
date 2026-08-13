import type { ClientAppModule } from "@rewindom/module-sdk/client";

import { NOTE_ENTITLEMENT } from "../shared/index.js";

import { NOTE_I18N } from "./i18n.js";
import { NOTE_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { NOTE_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderNoteRoutes } from "./tenant/routes.js";

export const noteClientModule: ClientAppModule = {
  id: "note",
  version: "1.0.0",
  label: "Notes",
  kind: "business",
  description: "租户内笔记 CRUD",
  tenantEntitlements: [NOTE_ENTITLEMENT],
  client: {
    i18n: NOTE_I18N,
    renderRoutes: renderNoteRoutes,
    nav: NOTE_NAV_SECTIONS,
    dashboardWidgets: NOTE_DASHBOARD_WIDGETS,
    // 底部 tab 只放高频业务入口；管理类页面走抽屉导航（见 MODULE.md）
    mobileTabPaths: ["/app/notes"],
  },
};
