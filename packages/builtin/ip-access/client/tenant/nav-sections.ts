import { ShieldBan } from "lucide-react";

import { APP_NAV_SECTION_ORDER, type AppNavSection } from "@rewindom/client-kit";

/**
 * label / title 用 `namespace:key`，由侧栏按当前语言解析。
 * 模块加载时 `t()` 会锁死为首屏语言。
 */
export const IP_ACCESS_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemManagement",
    placement: "end",
    order: APP_NAV_SECTION_ORDER.systemManagement,
    items: [
      {
        icon: ShieldBan,
        label: "ip-access:nav.label",
        path: "/app/ip-access",
        title: "ip-access:nav.title",
        tenantModule: "ip-access",
        anyPermission: ["ip_access.read"],
      },
    ],
  },
];
