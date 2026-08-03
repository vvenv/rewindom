import { Globe } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const SITE_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: Globe,
        label: "marketing:cms.nav",
        path: "/site",
        title: "marketing:cms.nav",
        keywords: "site marketing cms 官网 站点",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
    ],
  },
];
