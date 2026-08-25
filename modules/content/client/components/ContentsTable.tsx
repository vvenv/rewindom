import { useCallback, useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  useConfirm,
  usePermissions,
  formatBusinessDateOrTimeAgo,
  type DataTableFeatures,
} from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { PenLine, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { useDeleteContent } from "../hooks/useContentMutations.js";
import { displayContentTitle } from "../lib/contents.js";

import { ContentStatusBadge } from "./ContentStatusBadge.js";

import type { ContentListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

interface ContentsTableProps {
  items: ContentListItem[];
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
}

export function ContentsTable({
  items,
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
}: ContentsTableProps) {
  const { t } = useTranslation("content");
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteContent();
  const { hasPermission } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canWrite = hasPermission("contents.write");

  const handleDelete = useCallback(
    async (item: ContentListItem) => {
      const confirmed = await confirm({
        title: t("deleteConfirmTitle"),
        description: t("deleteConfirmDescription", {
          title: displayContentTitle(item.title, t),
        }),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }

      setDeletingId(item.id);
      try {
        await deleteMutation.mutateAsync(item.id);
        toast.success(t("toastDeleted"));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("deleteFailed"));
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deleteMutation, t],
  );

  const columns = useMemo<ColumnDef<DataTableFeatures, ContentListItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("colTitle")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="font-medium">
            {displayContentTitle(row.original.title, t)}
          </div>
        ),
      },
      {
        accessorKey: "format",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("colFormat")} />
        ),
        enableSorting: true,
        cell: ({ row }) => t(`format.${row.original.format}`),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("colStatus")} />
        ),
        enableSorting: true,
        cell: ({ row }) => <ContentStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "asset_count",
        header: t("colAssets"),
        enableSorting: false,
        cell: ({ row }) => row.original.asset_count,
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("colUpdated")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatBusinessDateOrTimeAgo(row.original.updated_at)}
          </span>
        ),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: t("colActions"),
              enableSorting: false,
              meta: { align: "right" as const },
              cell: ({ row }) => (
                <div
                  className="flex gap-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("deleteAriaLabel")}
                    disabled={
                      deletingId === row.original.id ||
                      row.original.status === "generating"
                    }
                    onClick={() => void handleDelete(row.original)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<DataTableFeatures, ContentListItem>,
          ]
        : []),
    ],
    [canWrite, deletingId, handleDelete, t],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      isLoading={isLoading && items.length === 0}
      isError={isError && items.length === 0}
      error={error}
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      emptyIcon={PenLine}
      emptyTitle={q ? t("emptyFiltered") : t("empty")}
      emptyDescription={q ? t("emptyFilteredHint") : t("emptyHint")}
      onRetry={onRetry}
      sorting={sorting}
      onSortingChange={onSortingChange}
      onRowClick={(item) => {
        void navigate(`/app/contents/${item.id}`);
      }}
    />
  );
}
