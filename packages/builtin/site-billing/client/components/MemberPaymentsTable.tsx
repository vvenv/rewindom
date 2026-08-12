import type { ReactElement } from "react";

import { EmptyState } from "@be-water/client-kit";
import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  formatPlanPrice,
  formatSiteBillingDate,
} from "../lib/site-billing-format.js";

import type { MemberPaymentSummary } from "../../shared/site-billing.js";

export function MemberPaymentsTable({
  payments,
}: {
  payments: MemberPaymentSummary[];
}): ReactElement {
  const { t } = useTranslation(["site-billing"]);

  if (payments.length === 0) {
    return (
      <EmptyState
        size="panel"
        icon={Receipt}
        title={t("payments.empty")}
        description={t("payments.emptyHint")}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">{t("payments.member")}</th>
            <th className="px-3 py-2 font-medium">{t("payments.time")}</th>
            <th className="px-3 py-2 font-medium">{t("payments.plan")}</th>
            <th className="px-3 py-2 font-medium">{t("payments.amount")}</th>
            <th className="px-3 py-2 font-medium">{t("payments.status")}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-t">
              <td className="px-3 py-2">
                {payment.member_email ?? payment.member_id}
              </td>
              <td className="px-3 py-2">
                {formatSiteBillingDate(payment.paid_at ?? payment.created_at)}
              </td>
              <td className="px-3 py-2">{payment.plan_slug ?? "—"}</td>
              <td className="px-3 py-2">
                {formatPlanPrice(payment.amount_cents, payment.currency)}
              </td>
              <td className="px-3 py-2">
                {t(`paymentStatus.${payment.status}`)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
