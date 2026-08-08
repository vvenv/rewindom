import { Bookmark } from "lucide-react";

import type { AppNavSection } from "@be-water/module-sdk/client";

export const BOOKMARK_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.examples",
    items: [
      {
        icon: Bookmark,
        label: "bookmark:nav.bookmarks",
        path: "/app/bookmarks",
        title: "bookmark:nav.bookmarks",
        keywords: "bookmark 书签",
        tenantModule: "bookmark",
        anyPermission: ["bookmark.read"],
      },
    ],
  },
];
