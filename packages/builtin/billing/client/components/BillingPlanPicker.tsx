import { EmptyState } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";

import { translatePlanDescription, translatePlanName } from "../../../platform/client/lib/plan-i18n.js";

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
  const { t } = useTranslation(["billing", "platform"]);

  if (plans.length === 0) {
    return (
      <EmptyState
        size="panel"
        icon={Package}
        title={t("plans.empty")}
        description={t("plans.emptyHint")}
      />
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
            <h3 className="font-medium">
              {translatePlanName(t, plan.plan_slug)}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {translatePlanDescription(t, plan.plan_slug) || plan.description}
            </p>
          </div>
          <p className="text-lg font-semibold">
            {plan.price_monthly == null
              ? t("plans.customPrice")
              : t("plans.perMonth", { price: plan.price_monthly })}
          </p>
          {canWrite ? (
            <Button
              type="button"
              disabled={!plan.checkout_available || isCheckingOut}
              onClick={() => onCheckout(plan.plan_slug)}
            >
              {plan.checkout_available
                ? t("plans.upgradeButton")
                : t("plans.notConfigured")}
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
