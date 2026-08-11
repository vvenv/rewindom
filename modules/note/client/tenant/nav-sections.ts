import { StickyNote } from "lucide-react";

import type { AppNavSection } from "@be-water/module-sdk/client";

/**
 * label / title 用 `namespace:key`，由侧栏 `translateAppNavSections` 按当前语言解析。
 * 禁止在模块加载时 `t()`——否则会锁死为首屏语言（通常是 zh-CN）。
 */
export const NOTE_NAV_SECTIONS: AppNavSection[] = [
  {
    // 与 todo / bookmark 共用同一 key，collectModuleNav 才能合并为同一分组
    label: "common:nav.examples",
    items: [
      {
        icon: StickyNote,
        label: "note:nav.notes",
        path: "/app/notes",
        title: "note:title",
        tenantModule: "note",
        anyPermission: ["note.read"],
      },
    ],
  },
];
