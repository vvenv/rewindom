import { lazy } from "react";

import type { PlatformDashboardSection } from "@rewindom/client-kit";

const IpAccessMonitorSection = lazy(() =>
  import("../components/IpAccessMonitorSection.js").then((module) => ({
    default: module.IpAccessMonitorSection,
  })),
);

/**
 * order 取小值：代理链配错会让整个封禁模块失真，它比性能指标更该被先看到。
 * 一切正常时组件自己返回 null，不占位置。
 */
export const IP_ACCESS_PLATFORM_DASHBOARD_SECTIONS: readonly PlatformDashboardSection[] =
  [
    {
      id: "ip-access.monitor",
      order: 5,
      component: IpAccessMonitorSection,
    },
  ];
