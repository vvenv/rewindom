import { DashboardWidgetCard } from "@rewindom/client-kit";
import { formatBusinessDate } from "@rewindom/shared";
import { Badge } from "@rewindom/ui/badge";
import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useBillingSubscription } from "../hooks/useBilling.js";

/** 工作台卡片：当前订阅的套餐、状态与周期结束时间。 */
export function BillingDashboardWidget() {
  const { t } = useTranslation("billing");
  const { data: subscription, isLoading, isError } = useBillingSubscription();

  return (
    <DashboardWidgetCard
      icon={CreditCard}
      title={t("dashboard.title")}
      to="/app/billing"
      viewAllLabel={t("dashboard.viewAll")}
      isLoading={isLoading}
      isError={isError}
      // 没有订阅不是错误：多数租户停在免费版，这里给出与订阅页一致的说法
      isEmpty={!subscription}
      emptyText={t("subscription.none")}
    >
      {subscription ? (
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{t("subscription.plan")}</dt>
            <dd className="min-w-0 truncate font-medium">
              {subscription.plan_slug}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{t("subscription.status")}</dt>
            <dd>
              <Badge
                variant={
                  subscription.status === "active" ||
                  subscription.status === "trialing"
                    ? "secondary"
                    : "destructive"
                }
              >
                {t(`status.${subscription.status}`)}
              </Badge>
            </dd>
          </div>
          {subscription.current_period_end ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">
                {t("subscription.periodEnd")}
              </dt>
              <dd className="tabular-nums">
                {formatBusinessDate(subscription.current_period_end)}
              </dd>
            </div>
          ) : null}
          {subscription.cancel_at_period_end ? (
            <p className="text-xs text-warning">
              {t("subscription.cancelScheduled")}
            </p>
          ) : null}
        </dl>
      ) : null}
    </DashboardWidgetCard>
  );
}
