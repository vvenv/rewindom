import {
  DashboardWidgetCard,
  DashboardWidgetList,
  DashboardWidgetRow,
} from "@be-water/client-kit";
import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Badge } from "@be-water/ui/badge";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useNotifications } from "../hooks/useNotifications.js";
import { useUnreadNotificationCount } from "../hooks/useUnreadNotificationCount.js";

const RECENT_COUNT = 5;

/**
 * 工作台卡片：未读通知。
 *
 * 没有「查看全部」链接——通知没有独立页面，入口是顶栏的活动中心面板。
 */
export function NotificationsDashboardWidget() {
  const { t } = useTranslation("notification");
  const { data, isLoading, isError } = useNotifications(
    1,
    RECENT_COUNT,
    true,
  );
  const { data: unread } = useUnreadNotificationCount();
  const items = data?.items ?? [];

  return (
    <DashboardWidgetCard
      icon={Bell}
      title={t("dashboard.title")}
      headerExtra={
        unread && unread.total > 0 ? (
          <Badge variant="secondary">{unread.total}</Badge>
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
            primary={item.title}
            secondary={formatBusinessDateOrTimeAgo(item.created_at)}
          />
        ))}
      </DashboardWidgetList>
    </DashboardWidgetCard>
  );
}
