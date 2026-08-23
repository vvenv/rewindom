import { Mail } from "lucide-react";

import type { AppNavSection } from "@rewindom/module-sdk/client";

/** 与 /app/site、/app/site-form 同组：订阅名单是站点的一类内容集合。 */
export const NEWSLETTER_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
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
