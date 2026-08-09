import { EmptyState } from "@be-water/client-kit";
import { formatTenantDisplayLabel } from "@be-water/shared";
import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatAmountCents, formatBillingDate } from "../lib/billing-format.js";

import type { BillingPayment } from "../../shared/index.js";

export function BillingPaymentsTable({
  payments,
  isLoading,
  error,
  showTenantColumn = false,
}: {
  payments: BillingPayment[];
  isLoading: boolean;
  error: Error | null;
  showTenantColumn?: boolean;
}) {
  const { t } = useTranslation(["billing", "common"]);

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">{t("payments.loading")}</p>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {t("payments.loadFailed", {
          message: error.message || t("payments.unknownError"),
        })}
      </p>
    );
  }

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
            {showTenantColumn ? (
              <th className="px-3 py-2 font-medium">{t("table.tenant")}</th>
            ) : null}
            <th className="px-3 py-2 font-medium">{t("payments.time")}</th>
            <th className="px-3 py-2 font-medium">{t("payments.plan")}</th>
            <th className="px-3 py-2 font-medium">{t("payments.amount")}</th>
            <th className="px-3 py-2 font-medium">{t("payments.status")}</th>
            <th className="px-3 py-2 font-medium">{t("payments.orderId")}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-t">
              {showTenantColumn ? (
                <td className="px-3 py-2 text-sm">
                  {formatTenantDisplayLabel(
                    payment.tenant_name,
                    payment.tenant_slug,
                  )}
                </td>
              ) : null}
              <td className="px-3 py-2">
                {formatBillingDate(payment.paid_at ?? payment.created_at)}
              </td>
              <td className="px-3 py-2">{payment.plan_slug ?? "—"}</td>
              <td className="px-3 py-2">
                {formatAmountCents(payment.amount_cents, payment.currency)}
              </td>
              <td className="px-3 py-2">{payment.status}</td>
              <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                {payment.provider_order_id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
