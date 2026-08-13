import {
  DashboardWidgetCard,
  DashboardWidgetList,
  DashboardWidgetRow,
} from "@rewindom/client-kit";
import { formatBusinessDateOrTimeAgo } from "@rewindom/shared";
import { ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuditLogs } from "../hooks/useAuditLogs.js";
import { translateAuditAction } from "../lib/audit-action-i18n.js";

const RECENT_COUNT = 5;

/** 工作台卡片：本租户最近的操作记录。 */
export function AuditDashboardWidget() {
  const { t } = useTranslation("audit");
  const { data, isLoading, isError } = useAuditLogs(
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
      icon={ScrollText}
      title={t("dashboard.title")}
      to="/app/audit-logs"
      viewAllLabel={t("dashboard.viewAll")}
      isLoading={isLoading}
      isError={isError}
      isEmpty={items.length === 0}
      emptyText={t("dashboard.empty")}
    >
      <DashboardWidgetList>
        {items.map((item) => (
          <DashboardWidgetRow
            key={item.id}
            primary={t("dashboard.entry", {
              username: item.username,
              action: translateAuditAction(t, item.action),
            })}
            secondary={formatBusinessDateOrTimeAgo(item.created_at)}
          />
        ))}
      </DashboardWidgetList>
    </DashboardWidgetCard>
  );
}
