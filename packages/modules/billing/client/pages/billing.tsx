import { PageLayout, usePermissions } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BillingPaymentsTable } from "../components/BillingPaymentsTable.js";
import { BillingPlanPicker } from "../components/BillingPlanPicker.js";
import {
  useBillingPayments,
  useBillingPlans,
  useBillingSubscription,
} from "../hooks/useBilling.js";
import {
  useCancelSubscription,
  useCreateCheckout,
} from "../hooks/useBillingMutations.js";
import {
  formatBillingDate,
  subscriptionStatusLabel,
} from "../lib/billing-format.js";

export function BillingPage() {
  const { t } = useTranslation(["billing", "common"]);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("billing.write");

  const subscriptionQuery = useBillingSubscription();
  const plansQuery = useBillingPlans();
  const paymentsQuery = useBillingPayments(1, 20, "created_at", "desc");

  const createCheckout = useCreateCheckout();
  const cancelSubscription = useCancelSubscription();

  const subscription = subscriptionQuery.data ?? null;

  async function handleCheckout(planSlug: string): Promise<void> {
    try {
      const result = await createCheckout.mutateAsync(planSlug);
      window.location.assign(result.checkout_url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("toast.checkoutFailed"),
      );
    }
  }

  async function handleCancel(): Promise<void> {
    try {
      await cancelSubscription.mutateAsync();
      toast.success(t("subscription.cancelScheduled"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("subscription.cancelFailed"),
      );
    }
  }

  return (
    <PageLayout
      icon={CreditCard}
      title={t("page.title")}
      description={t("page.description")}
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("subscription.current")}</h2>
          {subscriptionQuery.isLoading ? (
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
                  disabled={cancelSubscription.isPending}
                  onClick={() => void handleCancel()}
                >
                  {t("subscription.cancel")}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("subscription.none")}</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("plans.upgrade")}</h2>
          <BillingPlanPicker
            plans={plansQuery.data ?? []}
            canWrite={canWrite}
            isCheckingOut={createCheckout.isPending}
            onCheckout={(planSlug) => void handleCheckout(planSlug)}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("payments.history")}</h2>
          <BillingPaymentsTable
            payments={paymentsQuery.data?.items ?? []}
            isLoading={paymentsQuery.isLoading}
            error={
              paymentsQuery.error instanceof Error
                ? paymentsQuery.error
                : paymentsQuery.error
                  ? new Error(t("common:loadFailed"))
                  : null
            }
          />
        </section>
      </div>
    </PageLayout>
  );
}
