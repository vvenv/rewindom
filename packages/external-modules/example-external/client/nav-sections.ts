import { Bookmark } from "lucide-react";

import type { AppNavSection } from "@be-water/module-sdk/client";

export const EXAMPLE_EXTERNAL_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.examples",
    items: [
      {
        icon: Bookmark,
        label: "example-external:nav.bookmarks",
        path: "/app/example-external",
        title: "example-external:nav.bookmarks",
        keywords: "bookmark 外部书签 示例 external",
        tenantModule: "example-external",
        anyPermission: ["example-external.read"],
      },
    ],
  },
];
