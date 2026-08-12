import { CreditCard } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/** 挂在「官网 CMS」分组下，紧邻站点会员——它管的是那批会员的钱。 */
export const SITE_BILLING_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: CreditCard,
        label: "site-billing:nav.siteBilling",
        path: "/app/site-billing",
        title: "site-billing:nav.siteBilling",
        tenantModule: "tenant-site-billing",
        anyPermission: ["site_billing.read"],
      },
    ],
  },
];
