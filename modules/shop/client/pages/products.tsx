import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Package, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProductCreateSheet } from "../components/ProductCreateSheet.js";
import { ProductFilters, ProductsTable } from "../components/ProductsTable.js";
import { useProducts } from "../hooks/useShop.js";
import { useShopListPage } from "../hooks/useShopListPage.js";

export function ProductsPage() {
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
  const { data, isLoading, isError, error, refetch } = useProducts(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={Package}
      title={t("title")}
      description={t("pageDescription")}
      action={
        canWrite ? (
          <ProductCreateSheet>
            <DraggableFabTrigger storageKey="shop_product_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("create")}</span>
            </DraggableFabTrigger>
          </ProductCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <ProductFilters q={q} onFiltersChange={handleFiltersChange} />
        <ProductsTable
          products={data?.items ?? []}
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
