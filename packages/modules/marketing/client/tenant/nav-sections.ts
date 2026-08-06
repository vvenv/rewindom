import { Globe, Inbox } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const SITE_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: Globe,
        label: "marketing:cms.nav",
        path: "/app/site",
        title: "marketing:cms.nav",
        keywords: "site marketing cms 官网 站点",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: Inbox,
        label: "marketing:formSubmissions.nav",
        path: "/app/site/form-submissions",
        title: "marketing:formSubmissions.title",
        keywords: "form submissions leads 表单 提交 线索",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
    ],
  },
];
