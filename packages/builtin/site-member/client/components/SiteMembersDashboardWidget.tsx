import {
  DashboardWidgetCard,
  DashboardWidgetList,
  DashboardWidgetRow,
} from "@rewindom/client-kit";
import { formatBusinessDateOrTimeAgo } from "@rewindom/shared";
import { Badge } from "@rewindom/ui/badge";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSiteMembers } from "../hooks/use-site-members.js";

const RECENT_COUNT = 5;

/** 工作台卡片：站点会员总数 + 最近注册的会员。 */
export function SiteMembersDashboardWidget() {
  const { t } = useTranslation("site-member");
  const { data, isLoading, isError } = useSiteMembers(
    1,
    RECENT_COUNT,
    undefined,
    "created_at",
    "desc",
  );
  const members = data?.items ?? [];

  return (
    <DashboardWidgetCard
      icon={Users}
      title={t("dashboard.title")}
      to="/app/site-members"
      viewAllLabel={t("dashboard.viewAll")}
      headerExtra={
        data ? <Badge variant="secondary">{data.total}</Badge> : null
      }
      isLoading={isLoading}
      isError={isError}
      isEmpty={members.length === 0}
      emptyText={t("dashboard.empty")}
    >
      <DashboardWidgetList>
        {members.map((member) => (
          <DashboardWidgetRow
            key={member.id}
            primary={member.display_name || member.email}
            secondary={formatBusinessDateOrTimeAgo(member.created_at)}
          />
        ))}
      </DashboardWidgetList>
    </DashboardWidgetCard>
  );
}
