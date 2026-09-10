import { lazy } from "react";

import type { PlatformDashboardSection } from "@rewindom/client-kit";

const ScheduledJobsSection = lazy(() =>
  import("../components/ScheduledJobsSection.js").then((module) => ({
    default: module.ScheduledJobsSection,
  })),
);

/**
 * 排在依赖健康（0）与代理链告警（5）之后、性能指标（10+）之前：
 * 清理任务停摆不像依赖挂了那么急，但它会安静地把日志表撑爆，
 * 比慢查询更该先被看见。
 */
export const BACKGROUND_JOB_PLATFORM_DASHBOARD_SECTIONS: readonly PlatformDashboardSection[] =
  [
    {
      id: "background-job.scheduled",
      order: 8,
      component: ScheduledJobsSection,
    },
  ];
