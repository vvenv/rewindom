import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MailDeliveriesTable } from "../components/MailDeliveriesTable.js";
import { MailDeliveryFilters } from "../components/MailDeliveryFilters.js";
import { MailerStatusPanel } from "../components/MailerStatusPanel.js";
import { useMailDeliveries, useMailerConfig } from "../hooks/useMailer.js";
import { useMailerPage } from "../hooks/useMailerPage.js";

/** 瘦编排：URL 状态、两个查询、三个展示组件。 */
export function Mailer() {
  const { t } = useTranslation("mailer");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("mailer.write");

  const pageState = useMailerPage();
  const { data: config } = useMailerConfig();
  const { data, isLoading, isError, error } = useMailDeliveries({
    ...pageState.filters,
    page: pageState.page,
    pageSize: pageState.pageSize,
    sortBy: pageState.sortBy,
    sortDir: pageState.sortDir,
  });

  const hasFilters = Boolean(
    pageState.filters.q ||
      pageState.filters.status ||
      pageState.filters.source,
  );

  return (
    <PageLayout
      icon={Send}
      title={t("page.title")}
      description={t("page.description")}
    >
      <div className="flex flex-col gap-4">
        <MailerStatusPanel status={config} canWrite={canWrite} />

        <MailDeliveryFilters
          filters={pageState.filters}
          onFiltersChange={pageState.updateFilters}
        />

        <MailDeliveriesTable
          deliveries={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          page={data?.page ?? pageState.page}
          pageSize={data?.page_size ?? pageState.pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count ?? 0}
          sorting={pageState.sorting}
          onSortingChange={pageState.handleSortingChange}
          hasFilters={hasFilters}
        />
      </div>
    </PageLayout>
  );
}
