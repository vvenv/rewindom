import { ScrollText } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * section label 与 `error-log` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 的模块顺序决定。
 */
export const AUDIT_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemMonitoring",
    placement: "end",
    items: [
      {
        icon: ScrollText,
        label: "audit:nav.auditLogs",
        path: "/app/audit-logs",
        title: "audit:nav.auditLogs",
        keywords: "audit logs 审计 日志 操作记录",
        anyPermission: ["audit_logs.read"],
      },
    ],
  },
];
