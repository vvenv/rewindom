import { Palette } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * 与 user / rbac / billing 共用 `systemManagement` 分组；
 * `placement: "end"` 沉底钉在侧栏用户菜单上方。
 */
export const PLATFORM_TENANT_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemManagement",
    placement: "end",
    items: [
      {
        icon: Palette,
        label: "platform:branding.nav",
        path: "/settings",
        title: "platform:branding.nav",
        keywords: "settings branding logo favicon 品牌 设置",
        anyPermission: ["settings.read"],
      },
    ],
  },
];
