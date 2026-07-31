import { ListTodo } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * label / title 用 `namespace:key`，由侧栏 `translateAppNavSections` 按当前语言解析。
 * 禁止在模块加载时 `t()`——否则会锁死为首屏语言（通常是 zh-CN）。
 */
export const TODO_NAV_SECTIONS: AppNavSection[] = [
  {
    // 与 notes 共用同一 key，collectModuleNav 才能合并为同一分组
    label: "common:nav.examples",
    items: [
      {
        icon: ListTodo,
        label: "todos:nav.label",
        path: "/todos",
        title: "todos:title",
        keywords: "todos 待办 任务 清单",
        tenantModule: "todos",
        anyPermission: ["todos.read"],
      },
    ],
  },
];
