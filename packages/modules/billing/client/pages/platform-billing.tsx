import { useState } from "react";

import { useTenantFilter } from "@be-water/client-kit";
import { formatTenantDisplayLabel } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { useTranslation } from "react-i18next";

import { BillingPaymentsTable } from "../components/BillingPaymentsTable.js";
import {
  usePlatformBillingPayments,
  usePlatformBillingSubscriptions,
} from "../hooks/usePlatformBilling.js";
import {
  formatBillingDate,
  subscriptionStatusLabel,
} from "../lib/billing-format.js";

type Tab = "subscriptions" | "payments";

export function PlatformBillingPage() {
  const { t } = useTranslation(["billing", "common"]);
  const TenantFilter = useTenantFilter();
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [status, setStatus] = useState("");
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  const subscriptionsQuery = usePlatformBillingSubscriptions({
    page: 1,
    pageSize: 20,
    status: status || undefined,
    tenant_slug: tenantSlug || undefined,
    sortBy: "updated_at",
    sortDir: "desc",
  });

  const paymentsQuery = usePlatformBillingPayments({
    page: 1,
    pageSize: 20,
    status: status || undefined,
    tenant_slug: tenantSlug || undefined,
    sortBy: "created_at",
    sortDir: "desc",
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground hidden sm:block">
        {t("platform.description")}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={tab === "subscriptions" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("subscriptions")}
        >
          {t("platform.subscriptions")}
        </Button>
        <Button
          type="button"
          variant={tab === "payments" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("payments")}
        >
          {t("platform.payments")}
        </Button>
        {TenantFilter ? (
          <TenantFilter
            value={tenantSlug}
            onValueChange={setTenantSlug}
            placeholder={t("table.tenant")}
            showClear
            className="w-48"
          />
        ) : null}
        <input
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
          placeholder="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
      </div>

      {tab === "subscriptions" ? (
        <div className="overflow-x-auto rounded-md border">
          {subscriptionsQuery.isLoading ? (
            <p className="text-muted-foreground p-3 text-sm">{t("common:loading")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("table.tenant")}</th>
                  <th className="px-3 py-2 font-medium">{t("subscription.plan")}</th>
                  <th className="px-3 py-2 font-medium">{t("subscription.status")}</th>
                  <th className="px-3 py-2 font-medium">{t("table.periodEnd")}</th>
                  <th className="px-3 py-2 font-medium">{t("table.providerId")}</th>
                </tr>
              </thead>
              <tbody>
                {(subscriptionsQuery.data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 text-sm">
                      {formatTenantDisplayLabel(row.tenant_name, row.tenant_slug)}
                    </td>
                    <td className="px-3 py-2">{row.plan_slug}</td>
                    <td className="px-3 py-2">
                      {subscriptionStatusLabel(row.status)}
                    </td>
                    <td className="px-3 py-2">
                      {formatBillingDate(row.current_period_end)}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                      {row.provider_subscription_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <BillingPaymentsTable
          payments={paymentsQuery.data?.items ?? []}
          isLoading={paymentsQuery.isLoading}
          showTenantColumn
          error={
            paymentsQuery.error instanceof Error
              ? paymentsQuery.error
              : paymentsQuery.error
                ? new Error(t("common:loadFailed"))
                : null
          }
        />
      )}
    </div>
  );
}
