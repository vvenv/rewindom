import { useMemo } from "react";

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
import { Pencil, Tag, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DiscountEditSheet } from "./DiscountEditSheet.js";
import { useDeleteDiscount } from "../hooks/useShop.js";

import type { ShopDiscountListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

export function DiscountFilters({
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
        placeholder: t("discountSearchPlaceholder"),
        className: "max-w-56",
      }}
      hasActiveFilters={Boolean(q)}
      onReset={() => onFiltersChange({ q: undefined })}
    />
  );
}

export function DiscountsTable({
  discounts,
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
  discounts: ShopDiscountListItem[];
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
  const deleteDiscount = useDeleteDiscount();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");

  const columns = useMemo<ColumnDef<DataTableFeatures, ShopDiscountListItem>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fieldDiscountCode")} />
        ),
        enableSorting: true,
        cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      },
      {
        id: "value",
        header: t("fieldDiscountValue"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.type === "percent"
            ? `${row.original.value}%`
            : row.original.value,
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
              row.original.status === "active"
                ? "default"
                : row.original.status === "disabled"
                  ? "outline"
                  : "secondary"
            }
          >
            {row.original.status === "active"
              ? t("statusActive")
              : row.original.status === "disabled"
                ? t("statusDisabled")
                : t("statusDraft")}
          </Badge>
        ),
      },
      {
        id: "uses",
        header: t("fieldDiscountUses"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.max_uses == null
            ? String(row.original.used_count)
            : `${row.original.used_count} / ${row.original.max_uses}`,
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
              cell: ({
                row,
              }: {
                row: { original: ShopDiscountListItem };
              }) => (
                <div className="flex items-center justify-end gap-1">
                  <DiscountEditSheet discount={row.original}>
                    <Button variant="ghost" size="icon" aria-label={t("edit")}>
                      <Pencil className="size-4" />
                    </Button>
                  </DiscountEditSheet>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("delete")}
                    onClick={async (event) => {
                      event.stopPropagation();
                      const ok = await confirm({
                        title: t("deleteDiscountTitle"),
                        description: t("deleteDiscountDescription", {
                          code: row.original.code,
                        }),
                        destructive: true,
                      });
                      if (!ok) return;
                      try {
                        await deleteDiscount.mutateAsync(row.original.id);
                        toast.success(t("toastDiscountDeleted"));
                      } catch (err) {
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : t("deleteFailed"),
                        );
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<DataTableFeatures, ShopDiscountListItem>,
          ]
        : []),
    ],
    [canWrite, confirm, deleteDiscount, t],
  );

  return (
    <DataTable
      columns={columns}
      data={discounts}
      isLoading={isLoading}
      isError={isError}
      error={error}
      emptyIcon={Tag}
      emptyTitle={q ? t("emptyDiscountsFiltered") : t("emptyDiscounts")}
      emptyDescription={q ? undefined : t("emptyDiscountsHint")}
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
