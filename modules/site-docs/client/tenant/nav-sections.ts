import { FileText } from "lucide-react";

import {
  APP_NAV_SECTION_ORDER,
  type AppNavSection,
} from "@rewindom/module-sdk/client";

/** 挂在「站点」分组，与 marketing 的 `/app/site` 同组。 */
export const SITE_DOCS_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    order: APP_NAV_SECTION_ORDER.site,
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
