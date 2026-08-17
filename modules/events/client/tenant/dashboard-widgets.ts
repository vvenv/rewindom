import { Radar } from "lucide-react";
import { lazy } from "react";

import type { DashboardWidget } from "@rewindom/module-sdk/client";

/** lazy：工作台是落地页，事件模块的代码不该被带进首屏 chunk。 */
const EventsDashboardWidget = lazy(() =>
  import("../components/EventsDashboardWidget.js").then((module) => ({
    default: module.EventsDashboardWidget,
  })),
);

export const EVENTS_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "events.following",
    title: "events:dashboardTitle",
    icon: Radar,
    component: EventsDashboardWidget,
    order: 15,
    tenantModule: "events",
    anyPermission: ["events.read"],
  },
];
