import { lazy } from "react";

import { ScrollText } from "lucide-react";

import type { DashboardWidget } from "@be-water/client-kit";

/** lazy：工作台是落地页，卡片代码不该进首屏 chunk。 */
const AuditDashboardWidget = lazy(() =>
  import("../components/AuditDashboardWidget.js").then((module) => ({
    default: module.AuditDashboardWidget,
  })),
);

/** 与 `/app/audit-logs` 导航项同口径：没有 `audit_logs.read` 只能看到自己的记录，
 *  那种「只有我自己」的流水放在工作台没有意义，因此这里按权限收窄。 */
export const AUDIT_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "audit.recent",
    title: "audit:dashboard.title",
    icon: ScrollText,
    component: AuditDashboardWidget,
    order: 70,
    anyPermission: ["audit_logs.read"],
  },
];
