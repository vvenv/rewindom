import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { CreditCard, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MemberPlanCreateSheet } from "../components/MemberPlanSheet.js";
import { MemberPlansTable } from "../components/MemberPlansTable.js";
import { SiteBillingProviderStatusRow } from "../components/SiteBillingProviderStatusRow.js";
import {
  useMemberPlans,
  useSiteBillingProvider,
} from "../hooks/useSiteBilling.js";

/**
 * 会员套餐 —— 「卖什么、钱进谁的账号」。
 *
 * 会员的订阅与付款流水在 `/app/site-billing/records`：配套餐是偶发的编辑动作，
 * 查流水是日常的查看动作，两件事挤在一页时，四块内容纵向堆下来谁都得滚半屏。
 */
export function MemberPlansPage() {
  const { t } = useTranslation("site-billing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site_billing.write");

  const plans = useMemberPlans();
  const provider = useSiteBillingProvider();

  return (
    <PageLayout
      icon={CreditCard}
      title={t("page.plans.title")}
      description={t("page.plans.description")}
      action={
        canWrite ? (
          <MemberPlanCreateSheet>
            <DraggableFabTrigger storageKey="site_billing_plan_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("plans.add")}</span>
            </DraggableFabTrigger>
          </MemberPlanCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <SiteBillingProviderStatusRow
          status={provider.data}
          canWrite={canWrite}
        />

        <MemberPlansTable
          plans={plans.data ?? []}
          isLoading={plans.isLoading}
          isError={plans.isError}
          error={plans.error}
          canWrite={canWrite}
        />
      </div>
    </PageLayout>
  );
}
