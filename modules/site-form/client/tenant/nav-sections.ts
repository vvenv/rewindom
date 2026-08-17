import { Inbox } from "lucide-react";

import type { AppNavSection } from "@rewindom/module-sdk/client";

/** 挂在「官网 CMS」分组下：提交是站点的一类内容集合，和页面、媒体并列。 */
export const SITE_FORM_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: Inbox,
        label: "site-form:formSubmissions.nav",
        path: "/app/site-form",
        title: "site-form:formSubmissions.title",
        anyPermission: ["form.read"],
        tenantModule: "site-form",
      },
    ],
  },
];
