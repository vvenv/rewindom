import { Users } from "lucide-react";

import { APP_NAV_SECTION_ORDER, type AppNavSection } from "@rewindom/client-kit";

/** 挂在「受众」分组：会员是站点访客，不是站点内容。 */
export const SITE_MEMBER_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.audience",
    order: APP_NAV_SECTION_ORDER.audience,
    items: [
      {
        icon: Users,
        label: "site-member:admin.nav",
        path: "/app/site-members",
        title: "site-member:admin.nav",
        tenantModule: "site-member",
        anyPermission: ["site_members.read"],
      },
    ],
  },
];
