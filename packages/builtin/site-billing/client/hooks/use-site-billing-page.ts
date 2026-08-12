import { useState } from "react";

import { useConfirm, usePermissions } from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import { readLocalizedSetting } from "../../../marketing/shared/section-settings.js";

import {
  useMemberPayments,
  useMemberPlans,
  useMemberSubscriptions,
  useSiteBillingProvider,
} from "./useSiteBilling.js";
import { useDeleteMemberPlan } from "./useSiteBillingMutations.js";

import type { MemberPlanDetail } from "../../shared/site-billing.js";

const PAGE_SIZE = 20;

export function useSiteBillingPage() {
  const { t, i18n } = useTranslation(["site-billing", "common"]);
  const { hasPermission } = usePermissions();
  const { confirm } = useConfirm();
  const canWrite = hasPermission("site_billing.write");

  const plans = useMemberPlans();
  const subscriptions = useMemberSubscriptions(1, PAGE_SIZE);
  const payments = useMemberPayments(1, PAGE_SIZE);
  const provider = useSiteBillingProvider();
  const deletePlan = useDeleteMemberPlan();

  const [editing, setEditing] = useState<MemberPlanDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openCreate(): void {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(plan: MemberPlanDetail): void {
    setEditing(plan);
    setSheetOpen(true);
  }

  async function remove(plan: MemberPlanDetail): Promise<void> {
    const name =
      readLocalizedSetting(plan.name, i18n.language, i18n.language) ||
      Object.values(plan.name.__i18n).find(Boolean) ||
      plan.slug;

    const ok = await confirm({
      title: t("plans.delete"),
      description: t("plans.deleteConfirm", { name }),
    });
    if (!ok) return;

    try {
      await deletePlan.mutateAsync(plan.id);
      toast.success(t("plans.deleted"));
    } catch (err) {
      // 「还有人在订」就是走这条：服务端已经把原因翻好了，别覆盖成一句泛化的失败
      toast.error(err instanceof Error ? err.message : t("common:requestFailed"));
    }
  }

  return {
    canWrite,
    locale: i18n.language,
    plans,
    subscriptions,
    payments,
    provider,
    editing,
    sheetOpen,
    setSheetOpen,
    openCreate,
    openEdit,
    remove,
  };
}
