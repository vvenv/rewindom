import { KeyRound, Palette } from "lucide-react";

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
        // 叶子路径 + end:true：精确匹配，避免与 /app/settings/oauth 同时高亮
        path: "/app/settings/branding",
        end: true,
        title: "platform:branding.nav",
        anyPermission: ["settings.read"],
      },
      {
        icon: KeyRound,
        label: "platform:oauth.nav",
        path: "/app/settings/oauth",
        end: true,
        title: "platform:oauth.nav",
        anyPermission: ["settings.read"],
      },
    ],
  },
];
