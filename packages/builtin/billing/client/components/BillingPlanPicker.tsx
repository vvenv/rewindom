import { EmptyState } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  translatePlanDescription,
  translatePlanName,
} from "../../../platform/client/lib/plan-i18n.js";

import type { BillingPlanOffer, PlanChangeKind } from "../../shared/index.js";

/** 按钮文案随换挡方向变；`current` 那一档不该是个可点的「升级」。 */
const BUTTON_LABEL: Record<PlanChangeKind, string> = {
  none: "plans.subscribeButton",
  current: "plans.currentButton",
  upgrade: "plans.upgradeButton",
  downgrade: "plans.downgradeButton",
};

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
      {plans.map((plan) => {
        const isCurrent = plan.change_kind === "current";
        return (
          <div
            key={plan.plan_slug}
            className={`flex flex-col gap-3 rounded-md border p-4 ${
              isCurrent ? "border-primary" : ""
            }`}
          >
            <div>
              <h3 className="font-medium">
                {translatePlanName(t, plan.plan_slug)}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {translatePlanDescription(t, plan.plan_slug)}
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
                variant={isCurrent ? "outline" : "default"}
                disabled={!plan.checkout_available || isCheckingOut || isCurrent}
                onClick={() => onCheckout(plan.plan_slug)}
              >
                {plan.checkout_available
                  ? t(BUTTON_LABEL[plan.change_kind])
                  : t("plans.notConfigured")}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
