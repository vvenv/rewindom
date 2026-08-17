import type { ClientAppModule } from "@rewindom/module-sdk/client";

import { EVENTS_I18N } from "./i18n.js";
import { EVENTS_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { EVENTS_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderEventsRoutes } from "./tenant/routes.js";

import { EVENTS_ENTITLEMENT } from "../shared/index.js";

export const eventsClientModule: ClientAppModule = {
  id: "events",
  version: "1.0.0",
  label: "Events",
  kind: "business",
  description: "跨来源发现事件、重建时间线并持续追踪",
  tenantEntitlements: [EVENTS_ENTITLEMENT],
  client: {
    i18n: EVENTS_I18N,
    renderRoutes: renderEventsRoutes,
    nav: EVENTS_NAV_SECTIONS,
    dashboardWidgets: EVENTS_DASHBOARD_WIDGETS,
    // 底部 tab 只放高频业务入口，全站不超过 5 个（见 create-module skill）
    mobileTabPaths: ["/app/events"],
  },
};
