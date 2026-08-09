import { Bookmark } from "lucide-react";

import type { AppNavSection } from "@be-water/module-sdk/client";

/**
 * label / title 用 `namespace:key`，由侧栏 `translateAppNavSections` 按当前语言解析。
 * 禁止在模块加载时 `t()`——否则会锁死为首屏语言（通常是 zh-CN）。
 */
export const BOOKMARK_NAV_SECTIONS: AppNavSection[] = [
  {
    // 与 note / todo 共用同一 key，collectModuleNav 才能合并为同一分组
    label: "common:nav.examples",
    items: [
      {
        icon: Bookmark,
        label: "bookmark:nav.bookmarks",
        path: "/app/bookmarks",
        title: "bookmark:title",
        keywords: "bookmark 书签 收藏 网址 link",
        tenantModule: "bookmark",
        anyPermission: ["bookmark.read"],
      },
    ],
  },
];
