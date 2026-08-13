import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { DraggableFab } from "@rewindom/ui/draggable-fab";
import { FolderOpen, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  CollectionFilters,
  CollectionsTable,
} from "../components/CollectionsTable.js";
import { useCollections } from "../hooks/useShop.js";
import { useShopListPage } from "../hooks/useShopListPage.js";

export function CollectionsPage() {
  const { t } = useTranslation("shop");
  const {
    q,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  } = useShopListPage();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const { data, isLoading, isError, error, refetch } = useCollections(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={FolderOpen}
      title={t("collectionsTitle")}
      description={t("collectionsDescription")}
      action={
        canWrite ? (
          <DraggableFab
            to="/app/shop/collections/new"
            storageKey="shop_collection_create_fab"
          >
            <Plus className="size-6 md:size-4" />
            <span className="hidden md:inline">{t("createCollection")}</span>
          </DraggableFab>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <CollectionFilters q={q} onFiltersChange={handleFiltersChange} />
        <CollectionsTable
          collections={data?.items ?? []}
          isLoading={isLoading && !data}
          isError={isError && !data}
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
