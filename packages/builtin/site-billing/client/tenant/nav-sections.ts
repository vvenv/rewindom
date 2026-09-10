import { APP_NAV_SECTION_ORDER, type AppNavSection } from "@rewindom/client-kit";
import { CreditCard, Receipt } from "lucide-react";


/** 挂在「受众」分组，紧邻会员——它管的是那批会员的钱。 */
export const SITE_BILLING_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.audience",
    order: APP_NAV_SECTION_ORDER.audience,
    items: [
      {
        icon: CreditCard,
        label: "site-billing:nav.plans",
        path: "/app/site-billing",
        title: "site-billing:page.plans.title",
        // 记录页挂在它下面，不 end 的话两项会同时高亮
        end: true,
        tenantModule: "site-billing",
        anyPermission: ["site_billing.read"],
      },
      {
        icon: Receipt,
        label: "site-billing:nav.records",
        path: "/app/site-billing/records",
        title: "site-billing:page.records.title",
        tenantModule: "site-billing",
        anyPermission: ["site_billing.read"],
      },
    ],
  },
];
