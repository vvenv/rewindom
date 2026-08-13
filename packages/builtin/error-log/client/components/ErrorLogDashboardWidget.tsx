import {
  DashboardWidgetCard,
  DashboardWidgetList,
  DashboardWidgetRow,
} from "@rewindom/client-kit";
import { formatBusinessDateOrTimeAgo } from "@rewindom/shared";
import { Badge } from "@rewindom/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useErrorLogs } from "../hooks/useErrorLogs.js";
import { translateErrorLevel } from "../lib/error-level-i18n.js";

const RECENT_COUNT = 5;

/** 工作台卡片：最近的错误日志 + 总量徽标。 */
export function ErrorLogDashboardWidget() {
  const { t } = useTranslation("error-log");
  const { data, isLoading, isError } = useErrorLogs(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    1,
    RECENT_COUNT,
    "created_at",
    "desc",
  );
  const items = data?.items ?? [];

  return (
    <DashboardWidgetCard
      icon={AlertTriangle}
      title={t("dashboard.title")}
      to="/app/error-logs"
      viewAllLabel={t("dashboard.viewAll")}
      headerExtra={
        data && data.total > 0 ? (
          <Badge variant="destructive">{data.total}</Badge>
        ) : null
      }
      isLoading={isLoading}
      isError={isError}
      isEmpty={items.length === 0}
      emptyText={t("dashboard.empty")}
    >
      <DashboardWidgetList>
        {items.map((item) => (
          <DashboardWidgetRow
            key={item.id}
            primary={
              <span className="flex min-w-0 items-center gap-2">
                <Badge variant="outline" className="shrink-0">
                  {translateErrorLevel(t, item.level)}
                </Badge>
                <span className="min-w-0 truncate">{item.message}</span>
              </span>
            }
            secondary={formatBusinessDateOrTimeAgo(item.created_at)}
          />
        ))}
      </DashboardWidgetList>
    </DashboardWidgetCard>
  );
}
