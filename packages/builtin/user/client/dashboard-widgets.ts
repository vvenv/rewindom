import { lazy } from "react";

import { Users } from "lucide-react";

import type { DashboardWidget } from "@be-water/client-kit";

/** lazy：工作台是落地页，卡片代码不该进首屏 chunk。 */
const UsersDashboardWidget = lazy(() =>
  import("./components/UsersDashboardWidget.js").then((module) => ({
    default: module.UsersDashboardWidget,
  })),
);

/** 与 `/app/users` 同口径：`users.read` 才看得到成员名单。 */
export const USER_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "user.overview",
    title: "user:dashboard.title",
    icon: Users,
    component: UsersDashboardWidget,
    order: 50,
    anyPermission: ["users.read"],
  },
];
