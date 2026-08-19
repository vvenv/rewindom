import { lazy } from "react";

import type { PlatformDashboardSection } from "@rewindom/client-kit";

const SlowRequestMonitorSection = lazy(() =>
  import("../components/SlowRequestMonitorSection.js").then((module) => ({
    default: module.SlowRequestMonitorSection,
  })),
);

export const SLOW_REQUEST_PLATFORM_DASHBOARD_SECTIONS: readonly PlatformDashboardSection[] =
  [
    {
      id: "slow-request.stats",
      order: 20,
      component: SlowRequestMonitorSection,
    },
  ];
