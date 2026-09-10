import { APP_NAV_SECTION_ORDER, type AppNavSection } from "@rewindom/client-kit";
import { ScrollText } from "lucide-react";


/**
 * section label 与 `error-log` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 的模块顺序决定。
 */
export const AUDIT_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemMonitoring",
    placement: "end",
    order: APP_NAV_SECTION_ORDER.systemMonitoring,
    items: [
      {
        icon: ScrollText,
        label: "audit:nav.auditLogs",
        path: "/app/audit-logs",
        title: "audit:nav.auditLogs",
        anyPermission: ["audit_logs.read"],
      },
    ],
  },
];
