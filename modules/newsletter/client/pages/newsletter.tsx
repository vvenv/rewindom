import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

import { NewsletterFilters } from "../components/NewsletterFilters.js";
import { NewsletterListsPanel } from "../components/NewsletterListsPanel.js";
import { NewsletterSubscribersTable } from "../components/NewsletterSubscribersTable.js";
import {
  useNewsletterLists,
  useNewsletterRuns,
  useNewsletterSubscribers,
} from "../hooks/useNewsletter.js";
import { useNewsletterPage } from "../hooks/useNewsletterPage.js";

/** 瘦编排：URL 状态、三个查询、三个展示组件。 */
export function Newsletter() {
  const { t } = useTranslation("newsletter");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("newsletter.write");

  const pageState = useNewsletterPage();
  const { data: lists } = useNewsletterLists();
  const { data: runs } = useNewsletterRuns();
  const { data, isLoading, isError, error } = useNewsletterSubscribers({
    ...pageState.filters,
    page: pageState.page,
    pageSize: pageState.pageSize,
    sortBy: pageState.sortBy,
    sortDir: pageState.sortDir,
  });

  const hasFilters = Boolean(pageState.filters.q || pageState.filters.status);

  return (
    <PageLayout
      icon={Mail}
      title={t("page.title")}
      description={t("page.description")}
    >
      <div className="flex flex-col gap-4">
        <NewsletterListsPanel
          lists={lists?.items ?? []}
          runs={runs?.items ?? []}
          canWrite={canWrite}
        />

        <NewsletterFilters
          filters={pageState.filters}
          onFiltersChange={pageState.updateFilters}
        />

        <NewsletterSubscribersTable
          subscribers={data?.items ?? []}
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
