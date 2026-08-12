import type { ReactElement } from "react";

import { EmptyState } from "@be-water/client-kit";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatSiteBillingDate } from "../lib/site-billing-format.js";

import type { MemberSubscriptionSummary } from "../../shared/site-billing.js";

export function MemberSubscriptionsTable({
  subscriptions,
}: {
  subscriptions: MemberSubscriptionSummary[];
}): ReactElement {
  const { t } = useTranslation(["site-billing", "common"]);

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        size="panel"
        icon={Users}
        title={t("subscriptions.empty")}
        description={t("subscriptions.emptyHint")}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">{t("subscriptions.member")}</th>
            <th className="px-3 py-2 font-medium">{t("subscriptions.plan")}</th>
            <th className="px-3 py-2 font-medium">{t("subscriptions.status")}</th>
            <th className="px-3 py-2 font-medium">
              {t("subscriptions.periodEnd")}
            </th>
            <th className="px-3 py-2 font-medium">
              {t("subscriptions.cancelAtPeriodEnd")}
            </th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription) => (
            <tr key={subscription.id} className="border-t">
              <td className="px-3 py-2">
                {subscription.member_email ?? subscription.member_id}
              </td>
              <td className="px-3 py-2">{subscription.plan_slug}</td>
              <td className="px-3 py-2">{t(`status.${subscription.status}`)}</td>
              <td className="px-3 py-2">
                {formatSiteBillingDate(subscription.current_period_end)}
              </td>
              <td className="px-3 py-2">
                {subscription.cancel_at_period_end
                  ? t("common:yes")
                  : t("common:no")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
