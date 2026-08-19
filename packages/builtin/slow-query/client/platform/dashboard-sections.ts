import { lazy } from "react";

import type { PlatformDashboardSection } from "@rewindom/client-kit";

const SlowQueryMonitorSection = lazy(() =>
  import("../components/SlowQueryMonitorSection.js").then((module) => ({
    default: module.SlowQueryMonitorSection,
  })),
);

export const SLOW_QUERY_PLATFORM_DASHBOARD_SECTIONS: readonly PlatformDashboardSection[] =
  [
    {
      id: "slow-query.stats",
      order: 10,
      component: SlowQueryMonitorSection,
    },
  ];
