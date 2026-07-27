import { Users } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * section label 与 `rbac` 的一致，collectModuleNav 会把两者合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 的模块顺序决定（rbac 在 user 之前）。
 */
export const USER_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "系统管理",
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
