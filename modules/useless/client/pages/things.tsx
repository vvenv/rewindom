import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Plus, Quote } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ThingCreateSheet } from "../components/ThingCreateSheet.js";
import { ThingFilters } from "../components/ThingFilters.js";
import { ThingsTable } from "../components/ThingsTable.js";
import { useThings } from "../hooks/useThings.js";
import { useThingsPage } from "../hooks/useThingsPage.js";

export function Things() {
  const { t } = useTranslation("useless");
  const {
    q,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  } = useThingsPage();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("things.write");
  const { data, isLoading, isError, error, refetch } = useThings(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={Quote}
      title={t("title")}
      description={t("pageDescription")}
      action={
        canWrite ? (
          <ThingCreateSheet>
            <DraggableFabTrigger storageKey="things_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("create")}</span>
            </DraggableFabTrigger>
          </ThingCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <ThingFilters q={q} onFiltersChange={handleFiltersChange} />
        <ThingsTable
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
