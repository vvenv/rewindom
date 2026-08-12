import { lazy } from "react";

import { Users } from "lucide-react";

import type { DashboardWidget } from "@be-water/client-kit";

/** lazy：工作台是落地页，卡片代码不该进首屏 chunk。 */
const SiteMembersDashboardWidget = lazy(() =>
  import("../components/SiteMembersDashboardWidget.js").then((module) => ({
    default: module.SiteMembersDashboardWidget,
  })),
);

/** 与 `/app/site-members` 导航项同口径（未开通站点会员的租户不渲染）。 */
export const SITE_MEMBER_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "site-member.recent",
    title: "site-member:dashboard.title",
    icon: Users,
    component: SiteMembersDashboardWidget,
    order: 45,
    anyPermission: ["site_members.read"],
  },
];
