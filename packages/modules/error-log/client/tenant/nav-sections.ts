import { AlertTriangle } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * section label 与 `audit` 的一致，collectModuleNav 会合并为同一分组；
 * 组内顺序由 ENABLED_CLIENT_MODULES 的模块顺序决定。
 */
export const ERROR_LOG_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "系统监控",
    placement: "end",
    items: [
      {
        icon: AlertTriangle,
        label: "错误日志",
        path: "/error-logs",
        title: "错误日志",
        keywords: "error logs 错误 异常 报错 日志",
        anyPermission: ["error_logs.read"],
      },
    ],
  },
];
