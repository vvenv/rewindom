import { Users } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/** 挂在「官网 CMS」分组下，与 marketing 的 `/site` 同组。 */
export const SITE_MEMBER_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: Users,
        label: "site-member:admin.nav",
        path: "/site-members",
        title: "site-member:admin.nav",
        keywords: "site member members 会员 站点会员",
        tenantModule: "tenant-site-member",
        anyPermission: ["site_members.read"],
      },
    ],
  },
];
