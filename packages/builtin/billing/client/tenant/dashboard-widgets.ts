import { lazy } from "react";

import { CreditCard } from "lucide-react";

import type { DashboardWidget } from "@be-water/client-kit";

/** lazy：工作台是落地页，卡片代码不该进首屏 chunk。 */
const BillingDashboardWidget = lazy(() =>
  import("../components/BillingDashboardWidget.js").then((module) => ({
    default: module.BillingDashboardWidget,
  })),
);

/** 与 `/app/billing` 导航项同口径。 */
export const BILLING_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "billing.subscription",
    title: "billing:dashboard.title",
    icon: CreditCard,
    component: BillingDashboardWidget,
    order: 55,
    tenantModule: "billing",
    anyPermission: ["billing.read"],
  },
];
