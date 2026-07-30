import { useState } from "react";

import { Button } from "@be-water/ui/button";

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
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [status, setStatus] = useState("");
  const [tenantId, setTenantId] = useState("");

  const subscriptionsQuery = usePlatformBillingSubscriptions({
    page: 1,
    pageSize: 20,
    status: status || undefined,
    tenant_id: tenantId || undefined,
    sortBy: "updated_at",
    sortDir: "desc",
  });

  const paymentsQuery = usePlatformBillingPayments({
    page: 1,
    pageSize: 20,
    status: status || undefined,
    tenant_id: tenantId || undefined,
    sortBy: "created_at",
    sortDir: "desc",
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground hidden sm:block">
        跨租户订阅与付款记录（只读）
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={tab === "subscriptions" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("subscriptions")}
        >
          订阅
        </Button>
        <Button
          type="button"
          variant={tab === "payments" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("payments")}
        >
          付款
        </Button>
        <input
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
          placeholder="tenant_id"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        />
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
            <p className="text-muted-foreground p-3 text-sm">加载中…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">租户</th>
                  <th className="px-3 py-2 font-medium">套餐</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">周期结束</th>
                  <th className="px-3 py-2 font-medium">Provider ID</th>
                </tr>
              </thead>
              <tbody>
                {(subscriptionsQuery.data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.tenant_id}
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
          error={
            paymentsQuery.error instanceof Error
              ? paymentsQuery.error
              : paymentsQuery.error
                ? new Error("加载失败")
                : null
          }
        />
      )}
    </div>
  );
}
