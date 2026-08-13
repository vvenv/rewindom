import { useMemo } from "react";

import { Link } from "react-router";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  PageFilterBar,
  useConfirm,
  usePermissions,
  type DataTableFeatures,
} from "@rewindom/module-sdk/client";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { Package, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteProduct } from "../hooks/useShop.js";

import type { ShopProductListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

export function ProductFilters({
  q,
  onFiltersChange,
}: {
  q?: string;
  onFiltersChange: (filters: { q?: string }) => void;
}) {
  const { t } = useTranslation("shop");
  return (
    <PageFilterBar
      search={{
        value: q,
        onCommit: (value) => onFiltersChange({ q: value.trim() || undefined }),
        placeholder: t("searchPlaceholder"),
        className: "max-w-56",
      }}
      hasActiveFilters={Boolean(q)}
      onReset={() => onFiltersChange({ q: undefined })}
    />
  );
}

export function ProductsTable({
  products,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  q,
  sorting,
  onSortingChange,
  onRetry,
}: {
  products: ShopProductListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  q?: string;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation("shop");
  const { confirm } = useConfirm();
  const deleteProduct = useDeleteProduct();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");

  const columns = useMemo<ColumnDef<DataTableFeatures, ShopProductListItem>[]>(
    () => [
      {
        accessorKey: "slug",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fieldSlug")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <Link
              to={`/app/shop/products/${row.original.id}`}
              className="flex items-center gap-3 font-medium hover:underline"
            >
              {row.original.image_url ? (
                <img
                  src={row.original.image_url}
                  alt=""
                  className="size-10 shrink-0 rounded-md object-cover"
                />
              ) : null}
              <span>
                {row.original.title}
                <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                  {row.original.slug}
                </span>
              </span>
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fieldStatus")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "published"
                ? "default"
                : row.original.status === "archived"
                  ? "outline"
                  : "secondary"
            }
          >
            {row.original.status === "published"
              ? t("statusPublished")
              : row.original.status === "archived"
                ? t("statusArchived")
                : t("statusDraft")}
          </Badge>
        ),
      },
      {
        id: "stock",
        header: t("fieldStock"),
        enableSorting: false,
        cell: ({ row }) => row.original.total_stock,
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("createdAt")} />
        ),
        enableSorting: true,
        cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              enableSorting: false,
              meta: { align: "right" as const },
              cell: ({ row }: { row: { original: ShopProductListItem } }) => (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      to={`/app/shop/products/${row.original.id}`}
                      aria-label={t("edit")}
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("delete")}
                  onClick={async (event) => {
                    event.stopPropagation();
                    const ok = await confirm({
                      title: t("deleteConfirmTitle"),
                      description: t("deleteConfirmDescription", {
                        title: row.original.title,
                      }),
                      destructive: true,
                    });
                    if (!ok) return;
                    try {
                      await deleteProduct.mutateAsync(row.original.id);
                      toast.success(t("toastDeleted"));
                    } catch (err) {
                      toast.error(
                        err instanceof ApiError ? err.message : t("deleteFailed"),
                      );
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
                </div>
              ),
            } satisfies ColumnDef<DataTableFeatures, ShopProductListItem>,
          ]
        : []),
    ],
    [canWrite, confirm, deleteProduct, t],
  );

  return (
    <DataTable
      columns={columns}
      data={products}
      isLoading={isLoading}
      isError={isError}
      error={error}
      emptyIcon={Package}
      emptyTitle={q ? t("emptyFiltered") : t("empty")}
      emptyDescription={q ? undefined : t("emptyHint")}
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
      manualSorting
      onRetry={onRetry}
    />
  );
}
