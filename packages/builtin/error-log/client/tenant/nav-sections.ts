import { APP_NAV_SECTION_ORDER, type AppNavSection } from "@rewindom/client-kit";
import { AlertTriangle } from "lucide-react";


/**
 * section label 与 `audit` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 的模块顺序决定。
 */
export const ERROR_LOG_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemMonitoring",
    placement: "end",
    order: APP_NAV_SECTION_ORDER.systemMonitoring,
    items: [
      {
        icon: AlertTriangle,
        label: "error-log:nav.errorLogs",
        path: "/app/error-logs",
        title: "error-log:nav.errorLogs",
        anyPermission: ["error_logs.read"],
      },
    ],
  },
];
