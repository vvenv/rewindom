import {
  DashboardWidgetCard,
  DashboardWidgetList,
  DashboardWidgetRow,
} from "@be-water/client-kit";
import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Badge } from "@be-water/ui/badge";
import { Loader } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useBackgroundJobsList } from "../hooks/useBackgroundJobsList.js";

import type { BackgroundJobStatus } from "../../shared/index.js";

const RECENT_COUNT = 5;

const STATUS_VARIANT: Record<
  BackgroundJobStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  running: "default",
  success: "secondary",
  warning: "outline",
  error: "destructive",
  cancelled: "outline",
};

/**
 * 工作台卡片：最近的后台任务（备份、导入导出等）。
 *
 * 走租户侧 `/background-jobs`——那个接口只认证不查权限，返回的就是当前用户可见的任务，
 * 所以卡片不需要额外的权限收窄。
 */
export function BackgroundJobsDashboardWidget() {
  const { t } = useTranslation("background-job");
  const { data, isLoading, isError } = useBackgroundJobsList({
    isPlatformAdmin: false,
  });
  const jobs = (data ?? []).slice(0, RECENT_COUNT);

  return (
    <DashboardWidgetCard
      icon={Loader}
      title={t("dashboard.title")}
      isLoading={isLoading}
      isError={isError}
      isEmpty={jobs.length === 0}
      emptyText={t("dashboard.empty")}
    >
      <DashboardWidgetList>
        {jobs.map((job) => (
          <DashboardWidgetRow
            key={job.job_id}
            primary={
              <span className="flex min-w-0 items-center gap-2">
                <Badge variant={STATUS_VARIANT[job.status]} className="shrink-0">
                  {t(`dashboard.status.${job.status}`)}
                </Badge>
                <span className="min-w-0 truncate">{job.title}</span>
              </span>
            }
            secondary={formatBusinessDateOrTimeAgo(
              new Date(job.created_at).toISOString(),
            )}
          />
        ))}
      </DashboardWidgetList>
    </DashboardWidgetCard>
  );
}
