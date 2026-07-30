import { CreditCard } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const BILLING_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "设置",
    items: [
      {
        icon: CreditCard,
        label: "订阅与付款",
        path: "/billing",
        title: "订阅与付款",
        keywords: "billing subscription payment 订阅 付款 套餐",
        tenantModule: "billing",
        anyPermission: ["billing.read"],
      },
    ],
  },
];
