import { Button } from "@be-water/ui/button";

import type { BillingPlanOffer } from "../../shared/index.js";

export function BillingPlanPicker({
  plans,
  canWrite,
  isCheckingOut,
  onCheckout,
}: {
  plans: BillingPlanOffer[];
  canWrite: boolean;
  isCheckingOut: boolean;
  onCheckout: (planSlug: string) => void;
}) {
  if (plans.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">暂无可售套餐</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.plan_slug}
          className="flex flex-col gap-3 rounded-md border p-4"
        >
          <div>
            <h3 className="font-medium">{plan.name}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {plan.description}
            </p>
          </div>
          <p className="text-lg font-semibold">
            {plan.price_monthly == null
              ? "议价"
              : `¥${plan.price_monthly}/月`}
          </p>
          {canWrite ? (
            <Button
              type="button"
              disabled={!plan.checkout_available || isCheckingOut}
              onClick={() => onCheckout(plan.plan_slug)}
            >
              {plan.checkout_available ? "升级" : "未配置商品"}
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
