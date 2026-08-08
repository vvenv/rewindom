import { ListTodo } from "lucide-react";

import type { AppNavSection } from "@be-water/module-sdk/client";

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
        label: "todo:nav.label",
        path: "/app/todos",
        title: "todo:title",
        keywords: "todo 待办 任务 清单",
        tenantModule: "todo",
        anyPermission: ["todo.read"],
      },
    ],
  },
];
