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
import { FolderOpen, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteCollection } from "../hooks/useShop.js";

import type { ShopCollectionListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

export function CollectionFilters({
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
        placeholder: t("collectionSearchPlaceholder"),
        className: "max-w-56",
      }}
      hasActiveFilters={Boolean(q)}
      onReset={() => onFiltersChange({ q: undefined })}
    />
  );
}

export function CollectionsTable({
  collections,
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
  collections: ShopCollectionListItem[];
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
  const deleteCollection = useDeleteCollection();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");

  const columns = useMemo<ColumnDef<DataTableFeatures, ShopCollectionListItem>[]>(
    () => [
      {
        accessorKey: "slug",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fieldSlug")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            to={`/app/shop/collections/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.title}
            <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
              {row.original.slug}
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fieldStatus")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "published" ? "default" : "secondary"}>
            {row.original.status === "published"
              ? t("statusPublished")
              : t("statusDraft")}
          </Badge>
        ),
      },
      {
        id: "parent",
        header: t("fieldParentCollection"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.parent_title || (
            <span className="text-muted-foreground">{t("parentCollectionNone")}</span>
          ),
      },
      {
        id: "products",
        header: t("collectionProducts"),
        enableSorting: false,
        cell: ({ row }) => row.original.product_count,
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
                row: { original: ShopCollectionListItem };
              }) => (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      to={`/app/shop/collections/${row.original.id}`}
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
                        title: t("deleteCollectionTitle"),
                        description: t("deleteCollectionDescription", {
                          title: row.original.title,
                        }),
                        destructive: true,
                      });
                      if (!ok) return;
                      try {
                        await deleteCollection.mutateAsync(row.original.id);
                        toast.success(t("toastCollectionDeleted"));
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
            } satisfies ColumnDef<DataTableFeatures, ShopCollectionListItem>,
          ]
        : []),
    ],
    [canWrite, confirm, deleteCollection, t],
  );

  return (
    <DataTable
      columns={columns}
      data={collections}
      isLoading={isLoading}
      isError={isError}
      error={error}
      emptyIcon={FolderOpen}
      emptyTitle={q ? t("emptyCollectionsFiltered") : t("emptyCollections")}
      emptyDescription={q ? undefined : t("emptyCollectionsHint")}
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
