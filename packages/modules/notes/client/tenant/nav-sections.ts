import { StickyNote } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * label / title 用 `namespace:key`，由侧栏 `translateAppNavSections` 按当前语言解析。
 * 禁止在模块加载时 `t()`——否则会锁死为首屏语言（通常是 zh-CN）。
 */
export const NOTES_NAV_SECTIONS: AppNavSection[] = [
  {
    // 与 todos 共用同一 key，collectModuleNav 才能合并为同一分组
    label: "common:nav.examples",
    items: [
      {
        icon: StickyNote,
        label: "notes:nav.notes",
        path: "/notes",
        title: "notes:nav.notes",
        keywords: "notes 备忘 示例 memo",
        tenantModule: "notes",
        anyPermission: ["notes.read"],
      },
    ],
  },
];
