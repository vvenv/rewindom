import { lazy } from "react";

import { Loader } from "lucide-react";

import type { DashboardWidget } from "@rewindom/client-kit";

/** lazy：工作台是落地页，卡片代码不该进首屏 chunk。 */
const BackgroundJobsDashboardWidget = lazy(() =>
  import("./components/BackgroundJobsDashboardWidget.js").then((module) => ({
    default: module.BackgroundJobsDashboardWidget,
  })),
);

/** 任务按用户维度返回，无需权限门（同 `/background-jobs` 接口口径）。 */
export const BACKGROUND_JOB_DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: "background-job.recent",
    title: "background-job:dashboard.title",
    icon: Loader,
    component: BackgroundJobsDashboardWidget,
    order: 60,
  },
];
