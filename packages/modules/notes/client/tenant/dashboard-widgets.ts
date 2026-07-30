import { lazy } from "react";

import type { DashboardWidget } from "@be-water/client-kit";

/** lazy：工作台是落地页，笔记卡片不该把笔记模块的代码带进首屏 chunk。 */
const NotesDashboardWidget = lazy(() =>
  import("../components/NotesDashboardWidget.js").then((module) => ({
    default: module.NotesDashboardWidget,
  })),
);

export const NOTES_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "notes.recent",
    component: NotesDashboardWidget,
    order: 20,
    tenantModule: "notes",
    anyPermission: ["notes.read"],
  },
];
