import { PageLayout, usePermissions } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { CreditCard } from "lucide-react";
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
      toast.error(err instanceof Error ? err.message : "发起结账失败");
    }
  }

  async function handleCancel(): Promise<void> {
    try {
      await cancelSubscription.mutateAsync();
      toast.success("已安排在周期结束时取消订阅");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "取消订阅失败");
    }
  }

  return (
    <PageLayout
      icon={CreditCard}
      title="订阅与付款"
      description="查看当前套餐、升级订阅与付款历史"
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">当前订阅</h2>
          {subscriptionQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">加载中…</p>
          ) : subscription ? (
            <div className="rounded-md border p-4">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">套餐</dt>
                  <dd className="font-medium">{subscription.plan_slug}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">状态</dt>
                  <dd className="font-medium">
                    {subscriptionStatusLabel(subscription.status)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">当前周期结束</dt>
                  <dd>{formatBillingDate(subscription.current_period_end)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">周期末取消</dt>
                  <dd>{subscription.cancel_at_period_end ? "是" : "否"}</dd>
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
                  取消订阅
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              当前没有有效订阅（可能仍在免费版）
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">升级套餐</h2>
          <BillingPlanPicker
            plans={plansQuery.data ?? []}
            canWrite={canWrite}
            isCheckingOut={createCheckout.isPending}
            onCheckout={(planSlug) => void handleCheckout(planSlug)}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">付款历史</h2>
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
        </section>
      </div>
    </PageLayout>
  );
}
