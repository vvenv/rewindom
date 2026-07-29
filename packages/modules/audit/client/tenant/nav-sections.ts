import { ScrollText } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * section label 与 `error-log` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 的模块顺序决定。
 */
export const AUDIT_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "系统监控",
    placement: "end",
    items: [
      {
        icon: ScrollText,
        label: "审计日志",
        path: "/audit-logs",
        title: "审计日志",
        keywords: "audit logs 审计 日志 操作记录",
        anyPermission: ["audit_logs.read"],
      },
    ],
  },
];
