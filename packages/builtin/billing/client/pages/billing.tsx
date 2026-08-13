import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BillingPaymentsTable } from "../components/BillingPaymentsTable.js";
import { BillingPlanPicker } from "../components/BillingPlanPicker.js";
import { useBillingPage } from "../hooks/use-billing-page.js";
import {
  formatBillingDate,
  subscriptionStatusLabel,
} from "../lib/billing-format.js";

export function BillingPage() {
  const { t } = useTranslation(["billing", "common"]);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("billing.write");

  const {
    subscription,
    subscriptionLoading,
    plans,
    payments,
    activation,
    isCheckingOut,
    isCancelling,
    checkout,
    cancel,
  } = useBillingPage();

  return (
    <PageLayout
      icon={CreditCard}
      title={t("page.title")}
      description={t("page.description")}
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("subscription.current")}</h2>
          {subscriptionLoading ? (
            <p className="text-muted-foreground text-sm">{t("common:loading")}</p>
          ) : subscription ? (
            <div className="rounded-md border p-4">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("subscription.plan")}</dt>
                  <dd className="font-medium">{subscription.plan_slug}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("subscription.status")}</dt>
                  <dd className="font-medium">
                    {subscriptionStatusLabel(subscription.status)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("subscription.periodEnd")}</dt>
                  <dd>{formatBillingDate(subscription.current_period_end)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("subscription.cancelAtPeriodEnd")}
                  </dt>
                  <dd>
                    {subscription.cancel_at_period_end
                      ? t("common:yes")
                      : t("common:no")}
                  </dd>
                </div>
              </dl>
              {canWrite && !subscription.cancel_at_period_end ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  disabled={isCancelling}
                  onClick={() => void cancel()}
                >
                  {t("subscription.cancel")}
                </Button>
              ) : null}
            </div>
          ) : activation === "waiting" ? (
            /* 付款回跳后 webhook 还没到：这不是「没有订阅」，别把它画成没有 */
            <p className="text-muted-foreground text-sm">
              {t("checkout.processing")}
            </p>
          ) : activation === "timeout" ? (
            <p className="text-muted-foreground text-sm">{t("checkout.pending")}</p>
          ) : (
            <p className="text-muted-foreground text-sm">{t("subscription.none")}</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("plans.heading")}</h2>
          <BillingPlanPicker
            plans={plans.data ?? []}
            canWrite={canWrite}
            isCheckingOut={isCheckingOut}
            onCheckout={(planSlug) => void checkout(planSlug)}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("payments.history")}</h2>
          <BillingPaymentsTable
            payments={payments.data?.items ?? []}
            isLoading={payments.isLoading}
            error={
              payments.error instanceof Error
                ? payments.error
                : payments.error
                  ? new Error(t("common:loadFailed"))
                  : null
            }
          />
        </section>
      </div>
    </PageLayout>
  );
}
