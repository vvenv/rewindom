import { CreditCard, Receipt } from "lucide-react";

import type { AppNavSection } from "@rewindom/client-kit";

/** 挂在「官网 CMS」分组下，紧邻站点会员——它管的是那批会员的钱。 */
export const SITE_BILLING_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: CreditCard,
        label: "site-billing:nav.plans",
        path: "/app/site-billing",
        title: "site-billing:nav.plans",
        // 记录页挂在它下面，不 end 的话两项会同时高亮
        end: true,
        tenantModule: "site-billing",
        anyPermission: ["site_billing.read"],
      },
      {
        icon: Receipt,
        label: "site-billing:nav.records",
        path: "/app/site-billing/records",
        title: "site-billing:nav.records",
        tenantModule: "site-billing",
        anyPermission: ["site_billing.read"],
      },
    ],
  },
];
