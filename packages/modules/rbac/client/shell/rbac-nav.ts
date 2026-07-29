import { ShieldCheck } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

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
