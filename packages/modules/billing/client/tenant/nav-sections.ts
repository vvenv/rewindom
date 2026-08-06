import { CreditCard } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * section label 与 `user` / `rbac` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 的模块顺序决定（user → rbac → billing）。
 * `placement: "end"` 使该组沉底钉在侧栏用户菜单上方。
 */
export const BILLING_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemManagement",
    placement: "end",
    items: [
      {
        icon: CreditCard,
        label: "billing:nav.billing",
        path: "/app/billing",
        title: "billing:nav.billing",
        keywords: "billing subscription payment 订阅 付款 套餐",
        tenantModule: "billing",
        anyPermission: ["billing.read"],
      },
    ],
  },
];
