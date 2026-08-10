import { lazy } from "react";

import { Bell } from "lucide-react";

import type { DashboardWidget } from "@be-water/client-kit";

/** lazy：工作台是落地页，卡片代码不该进首屏 chunk。 */
const NotificationsDashboardWidget = lazy(() =>
  import("./components/NotificationsDashboardWidget.js").then((module) => ({
    default: module.NotificationsDashboardWidget,
  })),
);

/**
 * 不设 `anyPermission`：通知天然按 `user_id` 过滤，每个登录用户看的都是自己的。
 * 也不设 `tenantModule`——通知是基础设施，没有开关。
 */
export const NOTIFICATION_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "notification.unread",
    title: "notification:dashboard.title",
    icon: Bell,
    component: NotificationsDashboardWidget,
    order: 10,
  },
];
