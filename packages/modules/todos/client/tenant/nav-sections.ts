import { ListTodo } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const TODO_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "示例",
    items: [
      {
        icon: ListTodo,
        label: "待办",
        path: "/todos",
        title: "待办",
        keywords: "todos 待办 任务 清单",
        tenantModule: "todos",
        anyPermission: ["todos.read"],
      },
    ],
  },
];
