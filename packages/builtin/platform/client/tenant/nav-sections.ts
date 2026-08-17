import { Sparkles } from "lucide-react";

import type { AppNavSection } from "@rewindom/client-kit";

/**
 * section label 与 `user` / `rbac` / `billing` 的一致，collectModuleNav 会合并；
 * 组内顺序由 ENABLED_CLIENT_MODULES 决定（user → rbac → billing → platform）。
 */
export const PLATFORM_TENANT_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemManagement",
    placement: "end",
    items: [
      {
        icon: Sparkles,
        label: "platform:aiSettings.nav",
        path: "/app/settings",
        title: "platform:aiSettings.nav",
        anyPermission: ["settings.read"],
      },
    ],
  },
];
