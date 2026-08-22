import { Send } from "lucide-react";

import type { AppNavSection } from "@rewindom/client-kit";

/** 与系统管理组同 label，collectModuleNav 会合并进同一分组。 */
export const MAILER_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemManagement",
    placement: "end",
    items: [
      {
        icon: Send,
        label: "mailer:nav.mailer",
        path: "/app/mailer",
        // 移动端标题从这里解析，漏了就没有标题
        title: "mailer:nav.mailer",
        anyPermission: ["mailer.read"],
        tenantModule: "mailer",
      },
    ],
  },
];
