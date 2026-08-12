import { PageLayout } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MemberPaymentsTable } from "../components/MemberPaymentsTable.js";
import { MemberPlanSheet } from "../components/MemberPlanSheet.js";
import { MemberPlansTable } from "../components/MemberPlansTable.js";
import { MemberSubscriptionsTable } from "../components/MemberSubscriptionsTable.js";
import { SiteBillingProviderCard } from "../components/SiteBillingProviderCard.js";
import { useSiteBillingPage } from "../hooks/use-site-billing-page.js";

export function SiteBillingPage() {
  const { t } = useTranslation(["site-billing"]);
  const {
    canWrite,
    locale,
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
  } = useSiteBillingPage();

  return (
    <PageLayout
      icon={CreditCard}
      title={t("page.title")}
      description={t("page.description")}
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-medium">{t("plans.heading")}</h2>
            {canWrite ? (
              <Button type="button" size="sm" onClick={openCreate}>
                {t("plans.add")}
              </Button>
            ) : null}
          </div>
          <MemberPlansTable
            plans={plans.data ?? []}
            canWrite={canWrite}
            locale={locale}
            onEdit={openEdit}
            onDelete={(plan) => void remove(plan)}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("provider.heading")}</h2>
          <SiteBillingProviderCard status={provider.data} canWrite={canWrite} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("subscriptions.heading")}</h2>
          <MemberSubscriptionsTable
            subscriptions={subscriptions.data?.items ?? []}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{t("payments.heading")}</h2>
          <MemberPaymentsTable payments={payments.data?.items ?? []} />
        </section>
      </div>

      <MemberPlanSheet
        open={sheetOpen}
        plan={editing}
        onOpenChange={setSheetOpen}
      />
    </PageLayout>
  );
}
