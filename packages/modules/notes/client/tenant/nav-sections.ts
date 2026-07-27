import { StickyNote } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const NOTES_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "示例",
    items: [
      {
        icon: StickyNote,
        label: "笔记",
        path: "/notes",
        title: "笔记",
        keywords: "notes 备忘 示例",
        tenantModule: "notes",
        anyPermission: ["notes.read"],
      },
    ],
  },
];
