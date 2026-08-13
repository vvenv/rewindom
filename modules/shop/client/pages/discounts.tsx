import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Plus, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DiscountCreateSheet } from "../components/DiscountCreateSheet.js";
import { DiscountFilters, DiscountsTable } from "../components/DiscountsTable.js";
import { useDiscounts } from "../hooks/useShop.js";
import { useShopListPage } from "../hooks/useShopListPage.js";

export function DiscountsPage() {
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
  const { data, isLoading, isError, error, refetch } = useDiscounts(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={Tag}
      title={t("discountsTitle")}
      description={t("discountsDescription")}
      action={
        canWrite ? (
          <DiscountCreateSheet>
            <DraggableFabTrigger storageKey="shop_discount_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("createDiscount")}</span>
            </DraggableFabTrigger>
          </DiscountCreateSheet>
        ) : null
      }
    >
      <div className="flex max-w-full flex-col gap-4">
        <DiscountFilters q={q} onFiltersChange={handleFiltersChange} />
        <DiscountsTable
          discounts={data?.items ?? []}
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
