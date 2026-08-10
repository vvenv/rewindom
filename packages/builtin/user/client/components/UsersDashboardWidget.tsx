import {
  DashboardWidgetCard,
  DashboardWidgetList,
  DashboardWidgetRow,
} from "@be-water/client-kit";
import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Badge } from "@be-water/ui/badge";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useUsers } from "../hooks/useUsers.js";

const RECENT_COUNT = 5;

/** 工作台卡片：成员总数 + 最近加入的成员。 */
export function UsersDashboardWidget() {
  const { t } = useTranslation("user");
  const { data, isLoading, isError } = useUsers(
    1,
    RECENT_COUNT,
    undefined,
    "created_at",
    "desc",
  );
  const users = data?.items ?? [];

  return (
    <DashboardWidgetCard
      icon={Users}
      title={t("dashboard.title")}
      to="/app/users"
      viewAllLabel={t("dashboard.viewAll")}
      headerExtra={
        data ? <Badge variant="secondary">{data.total}</Badge> : null
      }
      isLoading={isLoading}
      isError={isError}
      isEmpty={users.length === 0}
      emptyText={t("dashboard.empty")}
    >
      <DashboardWidgetList>
        {users.map((user) => (
          <DashboardWidgetRow
            key={user.id}
            primary={user.username}
            secondary={formatBusinessDateOrTimeAgo(user.created_at)}
          />
        ))}
      </DashboardWidgetList>
    </DashboardWidgetCard>
  );
}
