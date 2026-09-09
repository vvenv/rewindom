import { PenLine } from "lucide-react";

import {
  APP_NAV_SECTION_ORDER,
  type AppNavSection,
} from "@rewindom/module-sdk/client";

/**
 * label / title 用 `namespace:key`，由侧栏 `translateAppNavSections` 按当前语言解析。
 * 禁止在模块加载时 `t()`——否则会锁死为首屏语言。
 */
export const CONTENT_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "content:nav.section",
    order: APP_NAV_SECTION_ORDER.content,
    items: [
      {
        icon: PenLine,
        label: "content:nav.contents",
        path: "/app/contents",
        title: "content:title",
        tenantModule: "contents",
        anyPermission: ["contents.read"],
      },
    ],
  },
];
