import { ListTodo } from "lucide-react";
import { lazy } from "react";

import type { DashboardWidget } from "@rewindom/module-sdk/client";

/** lazy：工作台是落地页，待办卡片不该把待办模块的代码带进首屏 chunk。 */
const TodosDashboardWidget = lazy(() =>
  import("../components/TodosDashboardWidget.js").then((module) => ({
    default: module.TodosDashboardWidget,
  })),
);

export const TODO_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "todo.pending",
    title: "todo:title",
    icon: ListTodo,
    component: TodosDashboardWidget,
    order: 30,
    tenantModule: "todo",
    anyPermission: ["todo.read"],
  },
];
