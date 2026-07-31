import { Users } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * section label 与 `rbac` / `billing` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 决定（user → rbac → billing）。
 * `placement: "end"` 使该组沉底钉在侧栏用户菜单上方。
 */
export const USER_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "系统管理",
    placement: "end",
    items: [
      {
        icon: Users,
        label: "用户管理",
        path: "/users",
        title: "用户管理",
        keywords: "users 用户 成员 账号",
        anyPermission: ["users.read"],
      },
    ],
  },
];
