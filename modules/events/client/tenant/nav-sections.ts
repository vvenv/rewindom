import { Radar, Rss } from "lucide-react";

import type { AppNavSection } from "@rewindom/module-sdk/client";

/**
 * label / title 用 `namespace:key`，由侧栏 `translateAppNavSections` 按当前语言解析。
 * 禁止在模块加载时 `t()`——否则会锁死为首屏语言。
 */
export const EVENTS_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "events:nav.section",
    items: [
      {
        icon: Radar,
        label: "events:nav.events",
        path: "/app/events",
        title: "events:title",
        end: true,
        tenantModule: "events",
        anyPermission: ["events.read"],
      },
      {
        icon: Rss,
        label: "events:nav.sources",
        path: "/app/events/sources",
        title: "events:sources.title",
        tenantModule: "events",
        anyPermission: ["events.read"],
      },
    ],
  },
];
