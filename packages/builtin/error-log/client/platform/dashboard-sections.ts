import { lazy } from "react";

import type { PlatformDashboardSection } from "@rewindom/client-kit";

const ErrorLogMonitorSection = lazy(() =>
  import("../components/ErrorLogMonitorSection.js").then((module) => ({
    default: module.ErrorLogMonitorSection,
  })),
);

/** order 取小值：依赖挂了比慢查询更该先被看到。 */
export const ERROR_LOG_PLATFORM_DASHBOARD_SECTIONS: readonly PlatformDashboardSection[] =
  [
    {
      id: "error-log.monitor",
      order: 0,
      component: ErrorLogMonitorSection,
    },
  ];
