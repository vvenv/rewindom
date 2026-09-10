import { APP_NAV_SECTION_ORDER, type AppNavSection } from "@rewindom/client-kit";
import { ShieldCheck } from "lucide-react";


/**
 * section label 与 `user` / `billing` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 决定（user → rbac → billing）。
 */
export const RBAC_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemManagement",
    placement: "end",
    order: APP_NAV_SECTION_ORDER.systemManagement,
    items: [
      {
        icon: ShieldCheck,
        label: "rbac:nav.roles",
        path: "/app/roles",
        title: "rbac:page.title",
        anyPermission: ["roles.read"],
      },
    ],
  },
];
