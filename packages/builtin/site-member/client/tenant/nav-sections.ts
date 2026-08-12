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
        path: "/app/site-members",
        title: "site-member:admin.nav",
        anyPermission: ["site_members.read"],
      },
    ],
  },
];
