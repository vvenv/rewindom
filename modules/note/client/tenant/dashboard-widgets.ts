import { StickyNote } from "lucide-react";
import { lazy } from "react";

import type { DashboardWidget } from "@rewindom/module-sdk/client";

/** lazy：工作台是落地页，笔记卡片不该把笔记模块的代码带进首屏 chunk。 */
const NotesDashboardWidget = lazy(() =>
  import("../components/NotesDashboardWidget.js").then((module) => ({
    default: module.NotesDashboardWidget,
  })),
);

export const NOTE_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "note.recent",
    title: "note:dashboardTitle",
    icon: StickyNote,
    component: NotesDashboardWidget,
    order: 20,
    tenantModule: "note",
    anyPermission: ["note.read"],
  },
];
