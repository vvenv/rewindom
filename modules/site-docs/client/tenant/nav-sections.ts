import { FileText } from "lucide-react";

import type { AppNavSection } from "@rewindom/module-sdk/client";

/** 挂在「官网 CMS」分组下，与 marketing 的 `/app/site` 同组。 */
export const SITE_DOCS_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: FileText,
        label: "site-docs:siteDocs.nav",
        path: "/app/docs",
        title: "site-docs:siteDocs.nav",
        anyPermission: ["docs.read"],
        tenantModule: "site-docs",
      },
    ],
  },
];
