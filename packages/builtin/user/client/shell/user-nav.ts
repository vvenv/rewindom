import { Users } from "lucide-react";

import type { AppNavSection } from "@rewindom/client-kit";

/**
 * section label 与 `rbac` / `billing` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 决定（user → rbac → billing）。
 * `placement: "end"` 使该组沉底钉在侧栏用户菜单上方。
 */
export const USER_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemManagement",
    placement: "end",
    items: [
      {
        icon: Users,
        label: "user:nav.users",
        path: "/app/users",
        title: "user:nav.users",
        anyPermission: ["users.read"],
      },
    ],
  },
];
