import { Mail } from "lucide-react";

import {
  APP_NAV_SECTION_ORDER,
  type AppNavSection,
} from "@rewindom/module-sdk/client";

/** 挂在「受众」分组：订阅者是站点访客，不是站点内容。 */
export const NEWSLETTER_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.audience",
    order: APP_NAV_SECTION_ORDER.audience,
    items: [
      {
        icon: Mail,
        label: "newsletter:nav.newsletter",
        path: "/app/newsletter",
        // 移动端标题从这里解析，漏了就没有标题
        title: "newsletter:nav.newsletter",
        anyPermission: ["newsletter.read"],
        tenantModule: "newsletter",
      },
    ],
  },
];
