import { ShieldCheck } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * section label 与 `user` / `billing` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 决定（user → rbac → billing）。
 */
export const RBAC_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "系统管理",
    placement: "end",
    items: [
      {
        icon: ShieldCheck,
        label: "角色权限",
        path: "/roles",
        title: "角色权限",
        keywords: "roles permissions 角色 权限 授权",
        anyPermission: ["roles.read"],
      },
    ],
  },
];
