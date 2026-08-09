import { lazy } from "react";

import type { DashboardWidget } from "@be-water/module-sdk/client";

/** lazy：工作台是落地页，书签卡片不该把书签模块的代码带进首屏 chunk。 */
const BookmarksDashboardWidget = lazy(() =>
  import("../components/BookmarksDashboardWidget.js").then((module) => ({
    default: module.BookmarksDashboardWidget,
  })),
);

export const BOOKMARK_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "bookmark.recent",
    component: BookmarksDashboardWidget,
    order: 40,
    tenantModule: "bookmark",
    anyPermission: ["bookmark.read"],
  },
];
