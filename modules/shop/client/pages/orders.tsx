import { useMemo } from "react";
import { useNavigate } from "react-router";

import {
  DataTable,
  DataTableColumnHeader,
  PageLayout,
  type DataTableFeatures,
} from "@be-water/module-sdk/client";
import { Badge } from "@be-water/ui/badge";
import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProductFilters } from "../components/ProductsTable.js";
import { useOrders } from "../hooks/useShop.js";
import { useShopListPage } from "../hooks/useShopListPage.js";

import type { ShopOrderListItem } from "../../shared/index.js";
import type { ColumnDef } from "@tanstack/react-table";

export function OrdersPage() {
  const { t } = useTranslation("shop");
  const navigate = useNavigate();
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
  const { data, isLoading, isError, error, refetch } = useOrders(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  );

  const columns = useMemo<ColumnDef<DataTableFeatures, ShopOrderListItem>[]>(
    () => [
      {
        accessorKey: "number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("orderNumber")} />
        ),
        enableSorting: true,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("status")} />
        ),
        enableSorting: true,
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        accessorKey: "email",
        header: t("email"),
        enableSorting: false,
      },
      {
        accessorKey: "total_cents",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("total")} />
        ),
        enableSorting: true,
        cell: ({ row }) =>
          `${(row.original.total_cents / 100).toFixed(2)} ${row.original.currency}`,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("createdAt")} />
        ),
        enableSorting: true,
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
      },
    ],
    [t],
  );

  return (
    <PageLayout
      icon={Receipt}
      title={t("ordersTitle")}
      description={t("ordersDescription")}
      action={null}
    >
      <div className="flex flex-col gap-4">
        <ProductFilters q={q} onFiltersChange={handleFiltersChange} />
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading && !data}
          isError={isError && !data}
          error={error}
          emptyIcon={Receipt}
          emptyTitle={t("empty")}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          manualSorting
          onRetry={() => void refetch()}
          onRowClick={(row) => navigate(`/app/shop/orders/${row.id}`)}
        />
      </div>
    </PageLayout>
  );
}
