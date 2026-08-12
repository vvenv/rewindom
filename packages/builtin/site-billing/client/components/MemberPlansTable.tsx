import type { ReactElement } from "react";

import { EmptyState } from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";

import { readLocalizedSetting } from "../../../marketing/shared/section-settings.js";
import { formatPlanPrice } from "../lib/site-billing-format.js";

import type { MemberPlanDetail } from "../../shared/site-billing.js";

export function MemberPlansTable({
  plans,
  canWrite,
  locale,
  onEdit,
  onDelete,
}: {
  plans: MemberPlanDetail[];
  canWrite: boolean;
  locale: string;
  onEdit: (plan: MemberPlanDetail) => void;
  onDelete: (plan: MemberPlanDetail) => void;
}): ReactElement {
  const { t } = useTranslation(["site-billing"]);

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
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">{t("plans.name")}</th>
            <th className="px-3 py-2 font-medium">{t("plans.slug")}</th>
            <th className="px-3 py-2 font-medium">{t("plans.price")}</th>
            <th className="px-3 py-2 font-medium">{t("plans.interval")}</th>
            <th className="px-3 py-2 font-medium">{t("plans.enabled")}</th>
            {canWrite ? <th className="px-3 py-2" /> : null}
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id} className="border-t">
              <td className="px-3 py-2">
                {readLocalizedSetting(plan.name, locale, locale) ||
                  Object.values(plan.name.__i18n).find(Boolean) ||
                  plan.slug}
              </td>
              <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                {plan.slug}
              </td>
              <td className="px-3 py-2">
                {formatPlanPrice(plan.price_cents, plan.currency)}
              </td>
              <td className="px-3 py-2">{t(`interval.${plan.interval}`)}</td>
              <td className="px-3 py-2">
                {/*
                  「上架」与「买得到」是两件事：没配商品 ID 的那一档即使上架了，
                  官网上也不会出现——把这一条直接标出来，省得站长对着空定价页排查。
                */}
                {!plan.enabled ? (
                  <Badge variant="outline">{t("common:no", { ns: "common" })}</Badge>
                ) : plan.purchasable ? (
                  <Badge>{t("common:yes", { ns: "common" })}</Badge>
                ) : (
                  <Badge variant="destructive">{t("plans.notPurchasable")}</Badge>
                )}
              </td>
              {canWrite ? (
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(plan)}
                  >
                    {t("plans.edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(plan)}
                  >
                    {t("plans.delete")}
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
