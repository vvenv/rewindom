import { lazy } from "react";

import { Globe } from "lucide-react";

import type { DashboardWidget } from "@rewindom/client-kit";

/** lazy：工作台是落地页，卡片代码不该进首屏 chunk。 */
const SiteDashboardWidget = lazy(() =>
  import("../components/SiteDashboardWidget.js").then((module) => ({
    default: module.SiteDashboardWidget,
  })),
);

/** 与 `/app/site` 导航项同口径。 */
export const MARKETING_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "marketing.site",
    title: "marketing:dashboard.title",
    icon: Globe,
    component: SiteDashboardWidget,
    order: 15,
    tenantModule: "tenant-marketing",
    anyPermission: ["site.read"],
  },
];
