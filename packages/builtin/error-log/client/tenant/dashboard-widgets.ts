import { lazy } from "react";

import { AlertTriangle } from "lucide-react";

import type { DashboardWidget } from "@be-water/client-kit";

/** lazy：工作台是落地页，卡片代码不该进首屏 chunk。 */
const ErrorLogDashboardWidget = lazy(() =>
  import("../components/ErrorLogDashboardWidget.js").then((module) => ({
    default: module.ErrorLogDashboardWidget,
  })),
);

/** 与 `/app/error-logs` 导航项同口径：无 `error_logs.read` 的成员只能看到自己触发的
 *  错误，不该在工作台上摆一张常年空着的卡片。 */
export const ERROR_LOG_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "error-log.recent",
    title: "error-log:dashboard.title",
    icon: AlertTriangle,
    component: ErrorLogDashboardWidget,
    order: 80,
    anyPermission: ["error_logs.read"],
  },
];
