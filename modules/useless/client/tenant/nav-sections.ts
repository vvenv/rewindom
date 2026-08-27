import { Quote } from "lucide-react";

import type { AppNavSection } from "@rewindom/module-sdk/client";

/**
 * label / title 用 `namespace:key`，由侧栏 `translateAppNavSections` 按当前语言解析。
 * 禁止在模块加载时 `t()`——否则会锁死为首屏语言。
 * 分组 key 借用 content 模块的，collectModuleNav 才会并进同一个「内容」分组。
 */
export const THING_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "content:nav.section",
    items: [
      {
        icon: Quote,
        label: "useless:nav.things",
        path: "/app/things",
        title: "useless:title",
        tenantModule: "useless",
        anyPermission: ["things.read"],
      },
    ],
  },
];
