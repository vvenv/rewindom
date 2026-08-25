import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Plus, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ContentCreateSheet } from "../components/ContentCreateSheet.js";
import { ContentFilters } from "../components/ContentFilters.js";
import { ContentsTable } from "../components/ContentsTable.js";
import { useContents } from "../hooks/useContents.js";
import { useContentsPage } from "../hooks/useContentsPage.js";

export function Contents() {
  const { t } = useTranslation("content");
  const {
    q,
    format,
    status,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  } = useContentsPage();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("contents.write");
  const { data, isLoading, isError, error, refetch } = useContents(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
    format,
    status,
  );

  return (
    <PageLayout
      icon={PenLine}
      title={t("title")}
      description={t("pageDescription")}
      action={
        canWrite ? (
          <ContentCreateSheet>
            <DraggableFabTrigger storageKey="contents_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("create")}</span>
            </DraggableFabTrigger>
          </ContentCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <ContentFilters
          q={q}
          format={format}
          status={status}
          onFiltersChange={handleFiltersChange}
        />
        <ContentsTable
          items={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          q={q}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
