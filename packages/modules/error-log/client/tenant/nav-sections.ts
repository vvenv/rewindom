import { getI18n } from "@be-water/client-kit";
import { AlertTriangle } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

const t = (key: string): string => getI18n().t(key, { ns: "error-log" });

/**
 * section label 与 `audit` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 的模块顺序决定。
 */
export const ERROR_LOG_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "common:nav.systemMonitoring",
    placement: "end",
    items: [
      {
        icon: AlertTriangle,
        label: "error-log:nav.errorLogs",
        path: "/error-logs",
        title: "error-log:nav.errorLogs",
        keywords: t("nav.keywords"),
        anyPermission: ["error_logs.read"],
      },
    ],
  },
];
